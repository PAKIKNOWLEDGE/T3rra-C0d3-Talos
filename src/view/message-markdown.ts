const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char);
}

function applyInlineMarkdown(escaped: string): string {
  let out = escaped.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  return out;
}

function renderTextBlock(text: string): string {
  const lines = text.split('\n');
  const parts: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    parts.push(`<ul>${listItems.map((item) => `<li>${applyInlineMarkdown(escapeHtml(item))}</li>`).join('')}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    if (!line.trim()) {
      parts.push('');
      continue;
    }
    parts.push(`<p>${applyInlineMarkdown(escapeHtml(line))}</p>`);
  }
  flushList();
  return parts.filter((part, index, array) => !(part === '' && array[index + 1] === '')).join('');
}

/** Safe markdown subset for assistant bubbles (no raw HTML). */
export function renderAssistantMessageHtml(text: string): string {
  const segments: string[] = [];
  const pattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(renderTextBlock(text.slice(lastIndex, match.index)));
    }
    segments.push(`<pre><code>${escapeHtml(match[2].replace(/\n$/, ''))}</code></pre>`);
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) segments.push(renderTextBlock(text.slice(lastIndex)));
  return segments.join('') || '<p></p>';
}

/** User messages: plain text, demo bubble typography. */
export function renderUserMessageHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '<p></p>';
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function stripRedactedThinking(text: string): string {
  const open = '<think>';
  const close = '</think>';
  let out = text;
  for (;;) {
    const start = out.indexOf(open);
    if (start < 0) break;
    const end = out.indexOf(close, start);
    if (end < 0) break;
    out = out.slice(0, start) + out.slice(end + close.length);
  }
  return out.trim();
}
