import { describe, expect, it } from 'vitest';
import { FactStore } from '../src/core/fact-store.js';

describe('timeline tool ordering', () => {
  it('appends tool timeline entries on first tool.update', () => {
    const store = new FactStore('t1');
    store.apply({
      kind: 'tool.update',
      processEpoch: 1,
      sessionId: 's1',
      toolCallId: 'tool-1',
      patch: { title: 'read_file', status: 'running' },
    });
    store.apply({
      kind: 'tool.update',
      processEpoch: 1,
      sessionId: 's1',
      toolCallId: 'tool-1',
      patch: { status: 'completed' },
    });
    const snap = store.snapshot();
    expect(snap.timeline.filter((item) => item.kind === 'tool')).toHaveLength(1);
    expect(snap.tools[0]?.status).toBe('completed');
  });
});
