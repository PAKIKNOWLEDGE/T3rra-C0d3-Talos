import { randomUUID } from 'node:crypto';
import type { MessageFact, TimelineItem, ToolFact } from '../core/types.js';
import { assistantMessageFact, layoutAssistantMessage, type LayoutMessage } from './studio-message-layout.js';

function userText(message: LayoutMessage): string | undefined {
  if (Array.isArray(message.parts)) {
    const chunks = message.parts
      .filter((part) => part?.type === 'text' && typeof part.content === 'string')
      .map((part) => part.content as string);
    if (chunks.length) return chunks.join('\n');
  }
  return typeof message.content === 'string' ? message.content : undefined;
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
    const message = raw as LayoutMessage;
    const messageId =
      typeof message.id === 'string' && message.id.trim() ? message.id.trim() : `hist-${randomUUID()}`;
    if (message.role === 'user') {
      const text = userText(message);
      if (text) {
        timeline.push({ kind: 'user', messageId, text });
        messages.push({ messageId, role: 'user', text });
      }
      continue;
    }
    if (message.role === 'assistant') {
      const layout = layoutAssistantMessage(message, messageId);
      timeline.push(...layout.timeline);
      for (const tool of layout.tools) {
        if (!tools.some((row) => row.toolCallId === tool.toolCallId)) tools.push(tool);
      }
      const fact = assistantMessageFact(messageId, layout.combinedText);
      if (fact) messages.push(fact);
    }
  }
  return { messages, timeline, tools };
}
