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

  it('renders GFM tables with escaped cells and inline markdown', () => {
    const md = [
      '| Name | Score |',
      '| --- | --- |',
      '| **Ada** | `42` |',
      '| Bob | 7 |',
    ].join('\n');
    const html = renderAssistantMessageHtml(md);
    expect(html).toContain('<table class="md-table">');
    expect(html).toContain('<thead><tr><th>');
    expect(html).toContain('<strong>Ada</strong>');
    expect(html).toContain('<code>42</code>');
    expect(html).not.toContain('| --- |');
    expect(html).not.toMatch(/\|---\|/);
  });

  it('keeps lists and fenced code when mixed with tables', () => {
    const md = [
      '- first',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '```txt',
      'fence',
      '```',
    ].join('\n');
    const html = renderAssistantMessageHtml(md);
    expect(html).toContain('<ul>');
    expect(html).toContain('<table class="md-table">');
    expect(html).toContain('<pre><code>fence</code></pre>');
    expect(html).not.toContain('| --- |');
  });

  it('escapes HTML inside table cells', () => {
    const md = ['| x |', '| --- |', '| <img onerror=alert(1)> |'].join('\n');
    const html = renderAssistantMessageHtml(md);
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img onerror');
  });
});
