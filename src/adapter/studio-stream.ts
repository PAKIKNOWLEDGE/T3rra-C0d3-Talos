import { randomUUID } from 'node:crypto';
import type { EngineEvent } from '../core/types.js';
import { layoutAssistantMessage, type LayoutMessage } from './studio-message-layout.js';
import { stripRedactedThinkingBlocks } from './studio-message-text.js';

type StreamMessage = LayoutMessage;

type StreamEvent = {
  type?: string;
  turnId?: string;
  message?: StreamMessage | string;
  messageId?: string;
  role?: string;
  content?: string;
  thinking?: string;
  toolCalls?: LayoutMessage['toolCalls'];
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

function withTurn<T extends EngineEvent>(event: T, turnId?: string): T {
  if (!turnId) return event;
  return { ...event, turnId };
}

const INTERNAL_GENERIC_EVENTS = new Set(['query_collapse_view']);

const GENERIC_NOTICE_EVENTS = new Set(['plan.updated', 'todo_updated']);

function pushThoughtDelta(
  events: EngineEvent[],
  processEpoch: number,
  sessionId: string,
  thoughtId: string,
  text: string,
  turnId?: string,
) {
  const cleaned = stripRedactedThinkingBlocks(text);
  if (!cleaned) return;
  events.push(
    withTurn(
      {
        kind: 'thought.delta',
        processEpoch,
        sessionId,
        thoughtId,
        text: cleaned,
      },
      turnId,
    ),
  );
}

/** Projects turn/event payloads into engine events. */
export class TurnStreamProjector {
  reset(): void {
    /* per-turn projector state is event-local */
  }

  project(
    processEpoch: number,
    sessionId: string,
    rawEvent: unknown,
    outerTurnId?: string,
  ): EngineEvent[] {
    if (!rawEvent || typeof rawEvent !== 'object') return [];
    const event = rawEvent as StreamEvent;
    const type = event.type;
    const turnId =
      (typeof event.turnId === 'string' && event.turnId) ||
      (typeof outerTurnId === 'string' && outerTurnId) ||
      undefined;
    const events: EngineEvent[] = [];

    if (type === 'delta') {
      const { messageId, thoughtId } = streamIds(event);
      if (typeof event.thinking === 'string' && event.thinking) {
        pushThoughtDelta(events, processEpoch, sessionId, thoughtId, event.thinking, turnId);
      }
      if (typeof event.content === 'string') {
        events.push(
          withTurn(
            {
              kind: 'assistant.delta',
              processEpoch,
              sessionId,
              messageId,
              text: stripRedactedThinkingBlocks(event.content),
            },
            turnId,
          ),
        );
      }
      for (const tool of event.toolCalls ?? []) {
        const mapped = toolPatch(tool);
        events.push(
          withTurn(
            {
              kind: 'tool.update',
              processEpoch,
              sessionId,
              toolCallId: mapped.toolCallId,
              patch: mapped.patch,
            },
            turnId,
          ),
        );
      }
      return events;
    }

    if (type === 'message' && event.message && typeof event.message === 'object') {
      const message = event.message;
      const messageId = message.id ?? `msg-${randomUUID()}`;
      if (message.role === 'user') {
        const text =
          (Array.isArray(message.parts)
            ? message.parts
                .filter((part) => part?.type === 'text' && typeof part.content === 'string')
                .map((part) => part.content as string)
                .join('\n')
            : undefined) ?? message.content;
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
        const hasParts = Array.isArray(message.parts) && message.parts.length > 0;
        if (hasParts) {
          const layout = layoutAssistantMessage(message, messageId);
          if (layout.thoughtText) {
            events.push(
              withTurn(
                {
                  kind: 'thought.replace',
                  processEpoch,
                  sessionId,
                  thoughtId,
                  text: layout.thoughtText,
                },
                turnId,
              ),
            );
          }
          events.push(
            withTurn(
              {
                kind: 'assistant.layout',
                processEpoch,
                sessionId,
                messageId,
                timeline: layout.timeline.filter((item) => item.kind !== 'thought'),
                tools: layout.tools,
                combinedText: layout.combinedText,
              },
              turnId,
            ),
          );
        } else {
          if (typeof message.thinking === 'string' && message.thinking) {
            const thought = stripRedactedThinkingBlocks(message.thinking);
            if (thought) {
              events.push(
                withTurn(
                  {
                    kind: 'thought.replace',
                    processEpoch,
                    sessionId,
                    thoughtId,
                    text: thought,
                  },
                  turnId,
                ),
              );
            }
          }
          if (typeof message.content === 'string') {
            events.push(
              withTurn(
                {
                  kind: 'assistant.replace',
                  processEpoch,
                  sessionId,
                  messageId,
                  text: stripRedactedThinkingBlocks(message.content),
                },
                turnId,
              ),
            );
          }
          for (const tool of message.toolCalls ?? []) {
            const mapped = toolPatch(tool);
            events.push(
              withTurn(
                {
                  kind: 'tool.update',
                  processEpoch,
                  sessionId,
                  toolCallId: mapped.toolCallId,
                  patch: mapped.patch,
                },
                turnId,
              ),
            );
          }
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
      if (!GENERIC_NOTICE_EVENTS.has(label)) return events;
      const detail = event.data && typeof event.data.message === 'string' ? event.data.message : undefined;
      if (!detail) return events;
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
  outerTurnId?: string,
): EngineEvent[] {
  return new TurnStreamProjector().project(processEpoch, sessionId, rawEvent, outerTurnId);
}

export function mapTurnCompletedStatus(
  status: string,
): 'end_turn' | 'cancelled' | 'max_turn_requests' | 'error' {
  if (status === 'succeeded') return 'end_turn';
  if (status === 'cancelled') return 'cancelled';
  return 'error';
}
