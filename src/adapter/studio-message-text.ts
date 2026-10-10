const THINKING_OPEN = '<think>';
const THINKING_CLOSE = '</think>';

/** Remove engine thinking wrappers only; preserve spaces and newlines. */
export function stripRedactedThinkingBlocks(text: string): string {
  let out = text;
  for (;;) {
    const start = out.indexOf(THINKING_OPEN);
    if (start < 0) break;
    const end = out.indexOf(THINKING_CLOSE, start);
    if (end < 0) break;
    out = out.slice(0, start) + out.slice(end + THINKING_CLOSE.length);
  }
  return out;
}
