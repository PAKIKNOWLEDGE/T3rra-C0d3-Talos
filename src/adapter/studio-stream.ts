import { randomUUID } from 'node:crypto';
import type { EngineEvent } from '../core/types.js';
import { sanitizeAssistantDisplay } from './acp-text.js';

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
  message?: StreamMessage;
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
  return text.replace(/<\/?redacted_thinking>/gi, '').trim();
}

function assistantTextFromMessage(message: StreamMessage): string | undefined {
  if (Array.isArray(message.parts)) {
    const chunks: string[] = [];
    for (const part of message.parts) {
      if (part?.type === 'text' && typeof part.content === 'string' && part.content) {
        chunks.push(part.content);
      }
    }
    if (chunks.length) return chunks.join('');
  }
  if (typeof message.content === 'string' && message.content) return message.content;
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

/** Tracks streamed assistant message ids so final `message` frames do not duplicate deltas. */
export class TurnStreamProjector {
  private readonly streamedMessageIds = new Set<string>();

  reset(): void {
    this.streamedMessageIds.clear();
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
        this.streamedMessageIds.add(messageId);
      }
      const text = typeof event.content === 'string' ? event.content : undefined;
      if (text) {
        events.push({
          kind: 'assistant.delta',
          processEpoch,
          sessionId,
          messageId,
          text: sanitizeAssistantDisplay(text),
        });
        this.streamedMessageIds.add(messageId);
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

    if (type === 'message' && event.message) {
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
        const alreadyStreamed = this.streamedMessageIds.has(messageId);
        if (!alreadyStreamed) {
          for (const chunk of thoughtChunksFromMessage(message)) {
            pushThought(events, processEpoch, sessionId, thoughtId, chunk);
          }
          const text = assistantTextFromMessage(message);
          if (text) {
            events.push({
              kind: 'assistant.delta',
              processEpoch,
              sessionId,
              messageId,
              text: sanitizeAssistantDisplay(text),
            });
          }
          this.streamedMessageIds.add(messageId);
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
    events.push({
      kind: 'error',
      processEpoch,
      sessionId,
      message: event.errorMessage ?? 'Turn stream failed.',
    });
    return events;
  }

  if (type === 'generic') {
    const label = typeof event.eventType === 'string' ? event.eventType : 'runtime';
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
      kind: 'stream.notice',
      processEpoch,
      sessionId,
      noticeId: `notice-${randomUUID()}`,
      text: `会话记录已变更（${type}），请重新加载会话以同步。`,
    });
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
