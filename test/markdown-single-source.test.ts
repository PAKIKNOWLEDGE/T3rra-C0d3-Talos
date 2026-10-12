import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  renderAssistantMessageHtml,
  renderTextBlock,
  renderUserMessageHtml,
} from '../src/view/message-markdown.js';

const repoRoot = resolve(import.meta.dirname, '..');
const talosSource = readFileSync(resolve(repoRoot, 'app/talos.js'), 'utf8');

/** Frozen HTML from baseline 256534a production `app/talos.js` (pre-extract). */
const BASELINE = {
  table:
    '<table class="md-table"><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td><strong>x</strong></td><td><code>y</code></td></tr></tbody></table>',
  mix:
    '<ul><li>a</li></ul><table class="md-table"><thead><tr><th>H</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><pre><code>ok</code></pre>',
  user: '<p>line1</p><p>line2</p>',
  thought: '<p><strong>think</strong></p>',
  xss:
    '<table class="md-table"><thead><tr><th>z</th></tr></thead><tbody><tr><td>&lt;b&gt;</td></tr></tbody></table>',
};

describe('markdown single source (r2-a)', () => {
  it('shared module output matches 256534a production baseline fixtures', () => {
    expect(
      renderAssistantMessageHtml(['| A | B |', '| --- | --- |', '| **x** | `y` |'].join('\n')),
    ).toBe(BASELINE.table);
    expect(
      renderAssistantMessageHtml(['- a', '| H |', '| --- |', '| 1 |', '```t\nok\n```'].join('\n')),
    ).toBe(BASELINE.mix);
    expect(renderUserMessageHtml('line1\n\nline2')).toBe(BASELINE.user);
    expect(renderTextBlock('**think**')).toBe(BASELINE.thought);
    expect(renderAssistantMessageHtml(['| z |', '| --- |', '| <b> |'].join('\n'))).toBe(
      BASELINE.xss,
    );
  });

  it('app/talos.js imports shared markdown and removes parallel renderer', () => {
    expect(talosSource).toContain("from '../src/view/message-markdown.ts'");
    expect(talosSource).not.toMatch(/function renderAssistantMessageHtml\b/);
    expect(talosSource).not.toMatch(/function renderUserMessageHtml\b/);
    expect(talosSource).not.toMatch(/function parseTableCells\b/);
    expect(talosSource).not.toMatch(/function applyInlineMarkdown\b/);
  });
});
