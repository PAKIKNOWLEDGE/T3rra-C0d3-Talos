import { randomUUID } from 'node:crypto';
import type { EngineEvent } from '../core/types.js';
import { stripRedactedThinkingBlocks } from './studio-message-text.js';

type StreamMessage = {
  id?: string;
  role?: string;
  content?: string;
  thinking?: string;
  parts?: Array<{ type?: string; content?: string }>;
  toolCalls?: Array<{
    id?: string;
    name?: string;
    status?: string | number;
    input?: unknown;
    output?: unknown;
  }>;
};

type StreamEvent = {
  type?: string;
  turnId?: string;
  message?: StreamMessage | string;
  messageId?: string;
  role?: string;
  content?: string;
  thinking?: string;
  toolCalls?: StreamMessage['toolCalls'];
  errorMessage?: string;
  eventType?: string;
  data?: Record<string, unknown>;
};

function streamIds(event: StreamEvent, fallbackMessageId?: string) {
  const turnId = typeof event.turnId === 'string' && event.turnId ? event.turnId : undefined;
  const messageId =
    fallbackMessageId ??
    event.messageId ??
    (turnId ? `assistant-${turnId}` : `assistant-${randomUUID()}`);
  const thoughtId = turnId ? `thought-${turnId}` : `thought-${messageId}`;
  return { turnId, messageId, thoughtId };
}

function toolPatch(tool: NonNullable<StreamEvent['toolCalls']>[number]) {
  const toolCallId = tool.id ?? tool.name ?? `tool-${randomUUID()}`;
  return {
    toolCallId,
    patch: {
      ...(tool.name ? { title: tool.name, kind: tool.name } : {}),
      ...(tool.status !== undefined ? { status: String(tool.status) } : {}),
      ...(tool.input !== undefined ? { rawInput: tool.input } : {}),
      ...(tool.output !== undefined ? { rawOutput: tool.output } : {}),
    },
  };
}

function sanitizeThoughtDisplay(text: string): string {
  return stripRedactedThinkingBlocks(text).trim();
}

function assistantTextFromMessage(message: StreamMessage): string | undefined {
  if (Array.isArray(message.parts)) {
    const chunks: string[] = [];
    for (const part of message.parts) {
      if (part?.type === 'text' && typeof part.content === 'string') {
        chunks.push(part.content);
      }
    }
    if (chunks.length) return stripRedactedThinkingBlocks(chunks.join(''));
  }
  if (typeof message.content === 'string' && message.content) {
    return stripRedactedThinkingBlocks(message.content);
  }
  return undefined;
}

function thoughtChunksFromMessage(message: StreamMessage): string[] {
  const chunks: string[] = [];
  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (part?.type === 'thinking' && typeof part.content === 'string' && part.content) {
        chunks.push(part.content);
      }
    }
  }
  if (typeof message.thinking === 'string' && message.thinking) chunks.push(message.thinking);
  return chunks;
}

function pushThought(
  events: EngineEvent[],
  processEpoch: number,
  sessionId: string,
  thoughtId: string,
  text: string,
) {
  const cleaned = sanitizeThoughtDisplay(text);
  if (!cleaned) return;
  events.push({
    kind: 'thought.delta',
    processEpoch,
    sessionId,
    thoughtId,
    text: cleaned,
  });
}

const INTERNAL_GENERIC_EVENTS = new Set(['query_collapse_view']);

/** Projects turn/event payloads into engine events. */
export class TurnStreamProjector {
  private readonly streamedThoughtKeys = new Set<string>();

  reset(): void {
    this.streamedThoughtKeys.clear();
  }

  project(processEpoch: number, sessionId: string, rawEvent: unknown): EngineEvent[] {
    if (!rawEvent || typeof rawEvent !== 'object') return [];
    const event = rawEvent as StreamEvent;
    const type = event.type;
    const events: EngineEvent[] = [];

    if (type === 'delta') {
      const { messageId, thoughtId } = streamIds(event);
      if (typeof event.thinking === 'string' && event.thinking) {
        pushThought(events, processEpoch, sessionId, thoughtId, event.thinking);
        this.streamedThoughtKeys.add(`${thoughtId}:${sanitizeThoughtDisplay(event.thinking)}`);
      }
      if (typeof event.content === 'string') {
        events.push({
          kind: 'assistant.delta',
          processEpoch,
          sessionId,
          messageId,
          text: stripRedactedThinkingBlocks(event.content),
        });
      }
      for (const tool of event.toolCalls ?? []) {
        const mapped = toolPatch(tool);
        events.push({
          kind: 'tool.update',
          processEpoch,
          sessionId,
          toolCallId: mapped.toolCallId,
          patch: mapped.patch,
        });
      }
      return events;
    }

    if (type === 'message' && event.message && typeof event.message === 'object') {
      const message = event.message;
      const messageId = message.id ?? `msg-${randomUUID()}`;
      if (message.role === 'user') {
        const text = assistantTextFromMessage(message) ?? message.content;
        if (text) {
          events.push({
            kind: 'user.message',
            processEpoch,
            sessionId,
            messageId,
            text,
          });
        }
      } else if (message.role === 'assistant') {
        const { thoughtId } = streamIds(event, messageId);
        for (const chunk of thoughtChunksFromMessage(message)) {
          const key = `${thoughtId}:${sanitizeThoughtDisplay(chunk)}`;
          if (this.streamedThoughtKeys.has(key)) continue;
          pushThought(events, processEpoch, sessionId, thoughtId, chunk);
          this.streamedThoughtKeys.add(key);
        }
        const text = assistantTextFromMessage(message);
        if (text !== undefined) {
          events.push({
            kind: 'assistant.replace',
            processEpoch,
            sessionId,
            messageId,
            text,
          });
        }
        for (const tool of message.toolCalls ?? []) {
          const mapped = toolPatch(tool);
          events.push({
            kind: 'tool.update',
            processEpoch,
            sessionId,
            toolCallId: mapped.toolCallId,
            patch: mapped.patch,
          });
        }
      }
      return events;
    }

    if (type === 'error') {
      const message =
        typeof event.message === 'string'
          ? event.message
          : typeof event.errorMessage === 'string'
            ? event.errorMessage
            : 'Turn stream failed.';
      events.push({
        kind: 'error',
        processEpoch,
        sessionId,
        message,
      });
      return events;
    }

    if (type === 'generic') {
      const label = typeof event.eventType === 'string' ? event.eventType : 'runtime';
      if (INTERNAL_GENERIC_EVENTS.has(label)) return events;
      const detail =
        event.data && typeof event.data.message === 'string'
          ? event.data.message
          : JSON.stringify(event.data ?? {});
      events.push({
        kind: 'stream.notice',
        processEpoch,
        sessionId,
        noticeId: `notice-${randomUUID()}`,
        text: `${label}: ${detail}`,
      });
      return events;
    }

    if (type === 'messages-replaced' || type === 'messages-rewound' || type === 'resync-required') {
      events.push({
        kind: 'session.history_resync',
        processEpoch,
        sessionId,
        reason: type,
      });
      return events;
    }

    return events;
  }
}

export function engineEventsFromTurnStream(
  processEpoch: number,
  sessionId: string,
  rawEvent: unknown,
): EngineEvent[] {
  return new TurnStreamProjector().project(processEpoch, sessionId, rawEvent);
}

export function mapTurnCompletedStatus(
  status: string,
): 'end_turn' | 'cancelled' | 'max_turn_requests' | 'error' {
  if (status === 'succeeded') return 'end_turn';
  if (status === 'cancelled') return 'cancelled';
  return 'error';
}
