import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  renderAssistantMessageHtml,
  renderUserMessageHtml,
  stripRedactedThinking,
} from '../src/view/message-markdown.js';

describe('message markdown', () => {
  it('renders bold without raw asterisks', () => {
    const html = renderAssistantMessageHtml('I am **Perlica**, your assistant.');
    expect(html).toContain('<strong>Perlica</strong>');
    expect(html).not.toContain('**');
  });

  it('escapes HTML in user and assistant text', () => {
    const evil = '<script>alert(1)</script>';
    expect(renderUserMessageHtml(evil)).not.toContain('<script>');
    expect(renderAssistantMessageHtml(evil)).not.toContain('<script>');
    expect(escapeHtml(evil)).toContain('&lt;script&gt;');
  });

  it('renders fenced code as pre, not inline mono on whole message', () => {
    const html = renderAssistantMessageHtml('Before\n```js\nconst x = 1;\n```\nAfter');
    expect(html).toContain('<pre><code>');
    expect(html).toContain('const x = 1;');
    expect(html).toContain('<p>Before</p>');
  });

  it('strips redacted thinking blocks', () => {
    expect(stripRedactedThinking('<think>x</think>hello')).toBe('hello');
  });
});
