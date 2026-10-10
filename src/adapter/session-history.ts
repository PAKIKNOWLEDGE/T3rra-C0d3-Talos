import { randomUUID } from 'node:crypto';
import type { MessageFact, TimelineItem, ToolFact } from '../core/types.js';
import { sanitizeAssistantDisplay } from './acp-text.js';

type HistoryMessage = {
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

function userText(message: HistoryMessage): string | undefined {
  if (Array.isArray(message.parts)) {
    const chunks = message.parts
      .filter((part) => part?.type === 'text' && typeof part.content === 'string')
      .map((part) => part.content as string);
    if (chunks.length) return chunks.join('\n');
  }
  return typeof message.content === 'string' ? message.content : undefined;
}

function assistantText(message: HistoryMessage): string | undefined {
  if (Array.isArray(message.parts)) {
    const chunks = message.parts
      .filter((part) => part?.type === 'text' && typeof part.content === 'string')
      .map((part) => part.content as string);
    if (chunks.length) return sanitizeAssistantDisplay(chunks.join(''));
  }
  if (typeof message.content === 'string' && message.content) {
    return sanitizeAssistantDisplay(message.content);
  }
  return undefined;
}

function thoughtTexts(message: HistoryMessage): string[] {
  const chunks: string[] = [];
  if (Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (part?.type === 'thinking' && typeof part.content === 'string' && part.content.trim()) {
        chunks.push(part.content.replace(/<\/?redacted_thinking>/gi, '').trim());
      }
    }
  }
  if (typeof message.thinking === 'string' && message.thinking.trim()) {
    chunks.push(message.thinking.replace(/<\/?redacted_thinking>/gi, '').trim());
  }
  return chunks.filter(Boolean);
}

function pushThought(timeline: TimelineItem[], thoughtId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (timeline.some((item) => item.kind === 'thought' && item.text.trim() === trimmed)) return;
  timeline.push({ kind: 'thought', thoughtId, text: trimmed });
}

function pushAssistant(
  timeline: TimelineItem[],
  messages: MessageFact[],
  messageId: string,
  text: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (timeline.some((item) => item.kind === 'assistant' && item.text.trim() === trimmed)) return;
  timeline.push({ kind: 'assistant', messageId, text: trimmed });
  messages.push({ messageId, role: 'assistant', text: trimmed });
}

function pushUser(timeline: TimelineItem[], messages: MessageFact[], messageId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  timeline.push({ kind: 'user', messageId, text: trimmed });
  messages.push({ messageId, role: 'user', text: trimmed });
}

function pushTool(
  timeline: TimelineItem[],
  tools: ToolFact[],
  tool: NonNullable<HistoryMessage['toolCalls']>[number],
) {
  const toolCallId =
    typeof tool.id === 'string' && tool.id.trim() ? tool.id.trim() : `hist-tool-${randomUUID()}`;
  if (tools.some((row) => row.toolCallId === toolCallId)) return;
  const fact: ToolFact = {
    toolCallId,
    ...(tool.name ? { title: tool.name, kind: tool.name } : {}),
    ...(tool.status !== undefined ? { status: String(tool.status) } : {}),
    ...(tool.input !== undefined ? { rawInput: tool.input } : {}),
    ...(tool.output !== undefined ? { rawOutput: tool.output } : {}),
  };
  tools.push(fact);
  timeline.push({ kind: 'tool', toolCallId });
}

export function mapStudioHistoryMessages(source: unknown[]): {
  messages: MessageFact[];
  timeline: TimelineItem[];
  tools: ToolFact[];
} {
  const timeline: TimelineItem[] = [];
  const messages: MessageFact[] = [];
  const tools: ToolFact[] = [];
  for (const raw of source) {
    if (!raw || typeof raw !== 'object') continue;
    const message = raw as HistoryMessage;
    const messageId =
      typeof message.id === 'string' && message.id.trim() ? message.id.trim() : `hist-${randomUUID()}`;
    const role = message.role === 'user' ? 'user' : message.role === 'assistant' ? 'assistant' : undefined;
    if (role === 'user') {
      const text = userText(message);
      if (text) pushUser(timeline, messages, messageId, text);
      continue;
    }
    if (role === 'assistant') {
      const thoughtId = `thought-${messageId}`;
      for (const chunk of thoughtTexts(message)) {
        pushThought(timeline, thoughtId, chunk);
      }
      const text = assistantText(message);
      if (text) pushAssistant(timeline, messages, messageId, text);
      for (const tool of message.toolCalls ?? []) {
        pushTool(timeline, tools, tool);
      }
    }
  }
  return { messages, timeline, tools };
}
