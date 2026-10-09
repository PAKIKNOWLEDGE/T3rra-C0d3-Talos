import type * as acp from '@agentclientprotocol/sdk';

export function textFromSessionUpdate(update: acp.SessionUpdate): string | undefined {
  if (
    'content' in update &&
    update.content &&
    !Array.isArray(update.content) &&
    update.content.type === 'text'
  ) {
    return update.content.text;
  }
  if ('text' in update && typeof (update as { text?: unknown }).text === 'string') {
    return (update as { text: string }).text;
  }
  return undefined;
}

const THINKING_OPEN = '<think>';
const THINKING_CLOSE = '</think>';

/** Hide engine thinking blocks from the product reading surface. */
export function sanitizeAssistantDisplay(text: string): string {
  let out = text;
  for (;;) {
    const start = out.indexOf(THINKING_OPEN);
    if (start < 0) break;
    const end = out.indexOf(THINKING_CLOSE, start);
    if (end < 0) break;
    out = out.slice(0, start) + out.slice(end + THINKING_CLOSE.length);
  }
  return out.trimStart();
}
