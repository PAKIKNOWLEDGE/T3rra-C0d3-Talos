import { randomUUID } from 'node:crypto';
import type { MessageFact, TimelineItem, ToolFact } from '../core/types.js';
import { stripRedactedThinkingBlocks } from './studio-message-text.js';

export type LayoutToolCall = {
  id?: string;
  name?: string;
  status?: string | number;
  input?: unknown;
  output?: unknown;
};

export type LayoutPart = {
  type?: string;
  content?: string;
  toolCall?: LayoutToolCall;
};

export type LayoutMessage = {
  id?: string;
  role?: string;
  content?: string;
  thinking?: string;
  parts?: LayoutPart[];
  toolCalls?: LayoutToolCall[];
};

export function layoutAssistantMessage(
  message: LayoutMessage,
  messageId: string,
): {
  thoughtId: string;
  thoughtText?: string;
  timeline: TimelineItem[];
  tools: ToolFact[];
  combinedText: string;
} {
  const thoughtId = `thought-${messageId}`;
  const timeline: TimelineItem[] = [];
  const tools: ToolFact[] = [];
  let combinedText = '';
  let segmentIndex = 0;

  const pushThought = (text: string) => {
    const cleaned = stripRedactedThinkingBlocks(text);
    if (!cleaned) return;
    timeline.push({ kind: 'thought', thoughtId, text: cleaned });
  };

  const pushText = (text: string) => {
    const cleaned = stripRedactedThinkingBlocks(text);
    if (!cleaned) return;
    combinedText += cleaned;
    const last = timeline.at(-1);
    if (last?.kind === 'assistant' && last.messageId === messageId && last.segmentIndex === segmentIndex) {
      last.text += cleaned;
      return;
    }
    timeline.push({ kind: 'assistant', messageId, segmentIndex, text: cleaned });
  };

  const pushTool = (tool: LayoutToolCall) => {
    const toolCallId =
      typeof tool.id === 'string' && tool.id.trim() ? tool.id.trim() : `tool-${randomUUID()}`;
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
    }
    timeline.push({ kind: 'tool', toolCallId });
    segmentIndex += 1;
  };

  if (Array.isArray(message.parts) && message.parts.length) {
    for (const part of message.parts) {
      if (part?.type === 'thinking' && typeof part.content === 'string') {
        pushThought(part.content);
        continue;
      }
      if (part?.type === 'text' && typeof part.content === 'string') {
        pushText(part.content);
        continue;
      }
      if (part?.type === 'tool' && part.toolCall) {
        pushTool(part.toolCall);
      }
    }
  } else {
    if (typeof message.thinking === 'string' && message.thinking) {
      pushThought(message.thinking);
    }
    if (typeof message.content === 'string' && message.content) {
      pushText(message.content);
    }
    for (const tool of message.toolCalls ?? []) {
      pushTool(tool);
    }
  }

  const thoughtItem = timeline.find((item) => item.kind === 'thought');
  return {
    thoughtId,
    thoughtText: thoughtItem?.kind === 'thought' ? thoughtItem.text : undefined,
    timeline,
    tools,
    combinedText,
  };
}

export function assistantMessageFact(messageId: string, combinedText: string): MessageFact | undefined {
  if (!combinedText) return undefined;
  return { messageId, role: 'assistant', text: combinedText };
}
