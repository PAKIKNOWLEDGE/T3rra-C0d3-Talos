/**
 * Synthetic fixtures for desktop-message-fidelity / r1.
 * CLI semantics source: Talos-CLI d045efc92408fd444487098da9a7c04318365882
 * (packages/tui/src/runtime/stream-events.ts, turn-live-projection.ts, turn-history-projection.ts)
 */
import { describe, expect, it } from 'vitest';
import { FactStore } from '../src/core/fact-store.js';
import { mapStudioHistoryMessages } from '../src/adapter/session-history.js';
import { TurnStreamProjector } from '../src/adapter/studio-stream.js';

const CLI_EVIDENCE_SHA = 'd045efc92408fd444487098da9a7c04318365882';

function projectAndApply(
  store: FactStore,
  sessionId: string,
  rawEvents: unknown[],
  processEpoch = 1,
): void {
  const projector = new TurnStreamProjector();
  store.apply({ kind: 'connected', processEpoch });
  for (const raw of rawEvents) {
    for (const event of projector.project(processEpoch, sessionId, raw)) {
      if (event.kind === 'session.history_resync') continue;
      store.apply(event);
    }
  }
}

describe('desktop-message-fidelity r1', () => {
  it('A1 preserves spaces, newlines, and code indentation across deltas', () => {
    const store = new FactStore('svc');
    const expected = 'I am\n```py\n  x = 1\n```';
    projectAndApply(store, 's1', [
      { type: 'delta', messageId: 'm1', content: 'I' },
      { type: 'delta', messageId: 'm1', content: ' ' },
      { type: 'delta', messageId: 'm1', content: 'am' },
      { type: 'delta', messageId: 'm1', content: '\n```py\n  x = 1\n```' },
    ]);
    const snap = store.snapshot();
    expect(snap.messages).toEqual([{ messageId: 'm1', role: 'assistant', text: expected }]);
    expect(snap.timeline.find((item) => item.kind === 'assistant')?.text).toBe(expected);
    expect(CLI_EVIDENCE_SHA.length).toBeGreaterThan(10);
  });

  it('A2 applies full message after deltas without duplicating body', () => {
    const store = new FactStore('svc');
    projectAndApply(store, 's1', [
      { type: 'delta', messageId: 'm1', thinking: 'plan' },
      { type: 'delta', messageId: 'm1', content: 'hel' },
      { type: 'delta', messageId: 'm1', content: 'lo' },
      {
        type: 'message',
        message: { id: 'm1', role: 'assistant', content: 'hello world', thinking: 'plan' },
      },
    ]);
    const snap = store.snapshot();
    expect(snap.messages).toEqual([{ messageId: 'm1', role: 'assistant', text: 'hello world' }]);
    expect(snap.timeline.filter((item) => item.kind === 'assistant')).toHaveLength(1);
    expect(snap.timeline.filter((item) => item.kind === 'thought')).toHaveLength(1);
  });

  it('A3 keeps two assistant messages with identical text', () => {
    const store = new FactStore('svc');
    projectAndApply(store, 's1', [
      { type: 'message', message: { id: 'a1', role: 'assistant', content: '好的' } },
      { type: 'message', message: { id: 'a2', role: 'assistant', content: '好的' } },
      { type: 'message', message: { id: 'a1', role: 'assistant', content: '好的' } },
    ]);
    const snap = store.snapshot();
    expect(snap.messages).toEqual([
      { messageId: 'a1', role: 'assistant', text: '好的' },
      { messageId: 'a2', role: 'assistant', text: '好的' },
    ]);
    expect(snap.timeline.filter((item) => item.kind === 'assistant')).toHaveLength(2);
  });

  it('A4 maps historical parts as text → tool → text', () => {
    const { timeline, tools, messages } = mapStudioHistoryMessages([
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'text', content: 'before ' },
          { type: 'tool', toolCall: { id: 't1', name: 'read_file', status: 'completed' } },
          { type: 'text', content: 'after' },
        ],
        content: 'legacy',
        toolCalls: [{ id: 'legacy', name: 'ignored' }],
      },
    ]);
    expect(timeline.map((item) => item.kind)).toEqual(['assistant', 'tool', 'assistant']);
    expect(tools).toHaveLength(1);
    expect(tools[0]?.toolCallId).toBe('t1');
    expect(messages[0]?.text).toBe('before after');
  });

  it('A5 suppresses query_collapse_view noise and reads stream error message field', () => {
    const projector = new TurnStreamProjector();
    const generic = projector.project(1, 's1', {
      type: 'generic',
      eventType: 'query_collapse_view',
      data: { query_collapse_view: { query_key: 'x' } },
    });
    expect(generic).toEqual([]);
    const err = projector.project(1, 's1', { type: 'error', message: 'provider down' });
    expect(err[0]).toMatchObject({ kind: 'error', message: 'provider down' });
    const resync = projector.project(1, 's1', { type: 'resync-required' });
    expect(resync[0]).toMatchObject({ kind: 'session.history_resync', reason: 'resync-required' });
  });

  it('A6 drops stale processEpoch events', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 2 });
    const applied = store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'stale',
      text: 'nope',
    });
    expect(applied).toBe(false);
    expect(store.snapshot().messages).toEqual([]);
  });

  it('continues assistant deltas after a stream notice on the timeline', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'Hello',
    });
    store.apply({
      kind: 'stream.notice',
      processEpoch: 1,
      sessionId: 's1',
      noticeId: 'n1',
      text: 'plan.updated: step',
    });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: ' world',
    });
    expect(store.snapshot().messages[0]?.text).toBe('Hello world');
    expect(store.snapshot().timeline.filter((item) => item.kind === 'assistant')).toHaveLength(1);
  });
});
