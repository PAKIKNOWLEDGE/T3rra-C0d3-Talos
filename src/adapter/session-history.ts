import { randomUUID } from 'node:crypto';
import type { MessageFact, TimelineItem, ToolFact } from '../core/types.js';
import { stripRedactedThinkingBlocks } from './studio-message-text.js';

type HistoryToolCall = {
  id?: string;
  name?: string;
  status?: string | number;
  input?: unknown;
  output?: unknown;
};

type HistoryPart = {
  type?: string;
  content?: string;
  toolCall?: HistoryToolCall;
};

type HistoryMessage = {
  id?: string;
  role?: string;
  content?: string;
  thinking?: string;
  parts?: HistoryPart[];
  toolCalls?: HistoryToolCall[];
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

function pushThought(timeline: TimelineItem[], thoughtId: string, text: string) {
  if (!text) return;
  const last = timeline.at(-1);
  if (last?.kind === 'thought' && last.thoughtId === thoughtId) {
    last.text += text;
    return;
  }
  timeline.push({ kind: 'thought', thoughtId, text });
}

function pushAssistantSegment(
  timeline: TimelineItem[],
  messageId: string,
  text: string,
  combinedText: { value: string },
) {
  if (!text) return;
  combinedText.value += text;
  const last = timeline.at(-1);
  if (last?.kind === 'assistant' && last.messageId === messageId) {
    last.text += text;
    return;
  }
  timeline.push({ kind: 'assistant', messageId, text });
}

function pushUser(timeline: TimelineItem[], messages: MessageFact[], messageId: string, text: string) {
  if (!text) return;
  timeline.push({ kind: 'user', messageId, text });
  messages.push({ messageId, role: 'user', text });
}

function pushTool(timeline: TimelineItem[], tools: ToolFact[], tool: HistoryToolCall) {
  const toolCallId =
    typeof tool.id === 'string' && tool.id.trim() ? tool.id.trim() : `hist-tool-${randomUUID()}`;
  let fact = tools.find((row) => row.toolCallId === toolCallId);
  if (!fact) {
    fact = {
      toolCallId,
      ...(tool.name ? { title: tool.name, kind: tool.name } : {}),
      ...(tool.status !== undefined ? { status: String(tool.status) } : {}),
      ...(tool.input !== undefined ? { rawInput: tool.input } : {}),
      ...(tool.output !== undefined ? { rawOutput: tool.output } : {}),
    };
    tools.push(fact);
  } else {
    Object.assign(fact, {
      ...(tool.name ? { title: tool.name, kind: tool.name } : {}),
      ...(tool.status !== undefined ? { status: String(tool.status) } : {}),
      ...(tool.input !== undefined ? { rawInput: tool.input } : {}),
      ...(tool.output !== undefined ? { rawOutput: tool.output } : {}),
    });
  }
  if (!timeline.some((item) => item.kind === 'tool' && item.toolCallId === toolCallId)) {
    timeline.push({ kind: 'tool', toolCallId });
  }
}

function mapAssistantMessage(
  timeline: TimelineItem[],
  messages: MessageFact[],
  tools: ToolFact[],
  message: HistoryMessage,
  messageId: string,
) {
  const thoughtId = `thought-${messageId}`;
  const combined = { value: '' };

  if (Array.isArray(message.parts) && message.parts.length) {
    for (const part of message.parts) {
      if (part?.type === 'thinking' && typeof part.content === 'string') {
        const cleaned = stripRedactedThinkingBlocks(part.content);
        if (cleaned) pushThought(timeline, thoughtId, cleaned);
        continue;
      }
      if (part?.type === 'text' && typeof part.content === 'string') {
        const cleaned = stripRedactedThinkingBlocks(part.content);
        pushAssistantSegment(timeline, messageId, cleaned, combined);
        continue;
      }
      if (part?.type === 'tool' && part.toolCall) {
        pushTool(timeline, tools, part.toolCall);
      }
    }
  } else {
    if (typeof message.thinking === 'string' && message.thinking) {
      const cleaned = stripRedactedThinkingBlocks(message.thinking);
      if (cleaned) pushThought(timeline, thoughtId, cleaned);
    }
    if (typeof message.content === 'string' && message.content) {
      const cleaned = stripRedactedThinkingBlocks(message.content);
      pushAssistantSegment(timeline, messageId, cleaned, combined);
    }
    for (const tool of message.toolCalls ?? []) {
      pushTool(timeline, tools, tool);
    }
  }

  if (combined.value) {
    messages.push({ messageId, role: 'assistant', text: combined.value });
  }
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
    if (message.role === 'user') {
      const text = userText(message);
      if (text) pushUser(timeline, messages, messageId, text);
      continue;
    }
    if (message.role === 'assistant') {
      mapAssistantMessage(timeline, messages, tools, message, messageId);
    }
  }
  return { messages, timeline, tools };
}
