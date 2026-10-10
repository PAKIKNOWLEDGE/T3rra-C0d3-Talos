import { describe, expect, it } from 'vitest';
import {
  formatRewindPreviewText,
  parseInspectionBundle,
  parseQueueItems,
} from '../src/adapter/studio-inspection.js';
import { FactStore } from '../src/core/fact-store.js';

describe('studio inspection parsing', () => {
  it('parses queue items', () => {
    const items = parseQueueItems({
      items: [{ itemId: 'q1', status: 'queued', content: 'next' }],
    });
    expect(items[0].content).toBe('next');
  });

  it('parses skills and mcp names', () => {
    const inspection = parseInspectionBundle(
      { skills: [{ name: 'lint' }] },
      { servers: [{ name: 'fs' }] },
      { diagnostics: { status: 'ok', version: '1' } },
    );
    expect(inspection.skillNames).toEqual(['lint']);
    expect(inspection.mcpServerNames).toEqual(['fs']);
    expect(inspection.diagnosticsSummary).toContain('ok');
  });

  it('formats rewind preview lines', () => {
    const text = formatRewindPreviewText({
      turns: [{ files: [{ filePath: 'a.ts', action: 'revert' }] }],
    });
    expect(text).toContain('a.ts');
  });

  it('applies session.queue to fact store', () => {
    const store = new FactStore('x');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    store.apply({
      kind: 'session.queue',
      processEpoch: 1,
      sessionId: 's1',
      items: [{ itemId: 'i1', status: 'queued' }],
    });
    expect(store.snapshot().queue).toHaveLength(1);
  });
});
