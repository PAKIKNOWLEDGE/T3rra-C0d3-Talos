/**
 * Synthetic fixtures for desktop-message-fidelity / r1.
 * CLI semantics source: Talos-CLI d045efc92408fd444487098da9a7c04318365882
 */
import { describe, expect, it, vi } from 'vitest';
import { FactStore } from '../src/core/fact-store.js';
import { mapStudioHistoryMessages } from '../src/adapter/session-history.js';
import { TurnStreamProjector } from '../src/adapter/studio-stream.js';
import { TalosStudioAdapter } from '../src/adapter/talos-studio.js';
import { StudioJsonRpcClient } from '../src/adapter/studio-jsonrpc.js';
import { TalosService } from '../src/service/talos-service.js';

const CLI_EVIDENCE_SHA = 'd045efc92408fd444487098da9a7c04318365882';

function projectAndApply(
  store: FactStore,
  sessionId: string,
  rawEvents: unknown[],
  processEpoch = 1,
  outerTurnId?: string,
): void {
  const projector = new TurnStreamProjector();
  store.apply({ kind: 'connected', processEpoch });
  for (const raw of rawEvents) {
    for (const event of projector.project(processEpoch, sessionId, raw, outerTurnId)) {
      store.apply(event);
    }
  }
}

const partsFixture = {
  id: 'a1',
  role: 'assistant',
  parts: [
    { type: 'text', content: 'before ' },
    { type: 'tool', toolCall: { id: 't1', name: 'read_file', status: 'completed' } },
    { type: 'text', content: 'after' },
  ],
};

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

  it('A2 preserves thinking spaces across deltas and full frame', () => {
    const store = new FactStore('svc');
    projectAndApply(store, 's1', [
      { type: 'delta', messageId: 'm1', thinking: 'I' },
      { type: 'delta', messageId: 'm1', thinking: ' think' },
      {
        type: 'message',
        message: { id: 'm1', role: 'assistant', content: 'ok', thinking: 'I think' },
      },
    ]);
    const thought = store.snapshot().timeline.find((item) => item.kind === 'thought');
    expect(thought?.text).toBe('I think');
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

  it('A4 matches live layout and history for text → tool → text', () => {
    const history = mapStudioHistoryMessages([partsFixture]);
    const store = new FactStore('svc');
    projectAndApply(store, 's1', [{ type: 'message', message: partsFixture }]);
    const live = store.snapshot();
    expect(live.timeline.map((item) => item.kind)).toEqual(history.timeline.map((item) => item.kind));
    expect(live.messages[0]?.text).toBe(history.messages[0]?.text);
    expect(live.tools[0]?.toolCallId).toBe('t1');
  });

  it('A4 keeps tool between text deltas for the same message', () => {
    const store = new FactStore('svc');
    projectAndApply(store, 's1', [
      { type: 'delta', messageId: 'm1', content: 'before ' },
      { type: 'delta', messageId: 'm1', toolCalls: [{ id: 't1', name: 'read_file' }] },
      { type: 'delta', messageId: 'm1', content: 'after' },
    ]);
    const snap = store.snapshot();
    expect(snap.timeline.map((item) => item.kind)).toEqual(['assistant', 'tool', 'assistant']);
    expect(snap.messages[0]?.text).toBe('before after');
  });

  it('A5 suppresses internal generic noise and reads stream error message field', () => {
    const projector = new TurnStreamProjector();
    expect(
      projector.project(1, 's1', {
        type: 'generic',
        eventType: 'query_collapse_view',
        data: { query_collapse_view: { query_key: 'x' } },
      }),
    ).toEqual([]);
    expect(
      projector.project(1, 's1', {
        type: 'generic',
        eventType: 'internal.new',
        data: { key: 'value' },
      }),
    ).toEqual([]);
    const err = projector.project(1, 's1', { type: 'error', message: 'provider down' });
    expect(err[0]).toMatchObject({ kind: 'error', message: 'provider down' });
    const resync = projector.project(1, 's1', { type: 'resync-required' });
    expect(resync[0]).toMatchObject({ kind: 'session.history_resync', reason: 'resync-required' });
  });

  it('A6 drops stale processEpoch and foreign session events via service path', () => {
    const store = new FactStore('svc');
    const service = new TalosService(store, {
      sendPrompt: async () => {},
      executeSlash: async () => {},
      renameSession: async () => {},
      archiveSession: async () => {},
      cancel: async () => {},
      replyApproval: async () => {},
      setMode: async () => {},
      setConfigOption: async () => {},
      createSession: async () => {},
      loadSession: async () => {},
      deleteSession: async () => {},
      replyQuestionnaire: async () => {},
      dismissQuestionnaire: async () => {},
      searchWorkspaceFiles: async () => [],
      listWorkspaceFiles: async () => [],
      steerTurn: async () => {},
      enqueueMessage: async () => {},
      deleteQueueItem: async () => {},
      continueQueue: async () => {},
      previewRewind: async () => 'preview',
      rewindSession: async () => {},
      steerQueueItem: async () => {},
      getForkOptions: async () => ({ canFork: false }),
      forkSession: async () => 's2',
      editSessionMessage: async () => {},
      updateQueueItem: async () => {},
      retrySessionHistory: async () => {},
    });
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.prepareSessionSwitch('s2', '/tmp');
    service.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's2', cwd: '/tmp' });
    service.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'foreign',
      text: 'nope',
    });
    expect(store.snapshot().messages).toEqual([]);
    service.apply({ kind: 'turn.started', processEpoch: 1, sessionId: 's2', turnId: 't2', prompt: 'hi' });
    service.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's2',
      messageId: 'm1',
      text: 'yes',
      turnId: 't-old',
    });
    expect(store.snapshot().messages).toEqual([]);
    service.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's2',
      messageId: 'm1',
      text: 'live',
      turnId: 't2',
    });
    expect(store.snapshot().messages[0]?.text).toBe('live');
  });

  it('G1 applies history returned after resync when no live stream facts arrived', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'OLD',
    });
    store.apply({ kind: 'session.history_resync', processEpoch: 1, sessionId: 's1', reason: 'resync-required' });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 1,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'NEW' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'NEW' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('NEW');
  });

  it('G1 still applies history after resync when only auxiliary session events arrived', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'session.history_resync', processEpoch: 1, sessionId: 's1', reason: 'resync-required' });
    store.apply({
      kind: 'session.context',
      processEpoch: 1,
      sessionId: 's1',
      context: { modelLabel: 'test-model' },
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 1,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'NEW' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'NEW' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('NEW');
  });

  it('H1 consumes skipped stale history so a later retry can apply fresh history', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'session.history_resync', processEpoch: 1, sessionId: 's1', reason: 'resync-required' });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'live',
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 1,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'OLD SNAPSHOT' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'OLD SNAPSHOT' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('live');
    store.apply({ kind: 'session.history_resync', processEpoch: 1, sessionId: 's1', reason: 'resync-required' });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 2,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'fresh retry' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'fresh retry' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('fresh retry');
  });

  it('H1 ignores tardy stale history after pending was already consumed', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'session.history_resync', processEpoch: 1, sessionId: 's1', reason: 'resync-required' });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'live',
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 1,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'OLD SNAPSHOT' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'OLD SNAPSHOT' }],
      tools: [],
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      messages: [{ messageId: 'm1', role: 'assistant', text: 'OLDER LATE' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'OLDER LATE' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('live');
  });

  it('F3 ignores stale history snapshots after live deltas during resync', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'session.history_resync', processEpoch: 1, sessionId: 's1', reason: 'resync-required' });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'NEW TEXT',
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 1,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'OLD SNAPSHOT' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'OLD SNAPSHOT' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('NEW TEXT');
  });

  it('I1 rejects out-of-order history when a newer request already applied', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({
      kind: 'session.history_resync',
      processEpoch: 1,
      sessionId: 's1',
      reason: 'resync-required',
      historyRequestId: 1,
    });
    store.apply({
      kind: 'session.history_resync',
      processEpoch: 1,
      sessionId: 's1',
      reason: 'resync-required',
      historyRequestId: 2,
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 2,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'NEW' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'NEW' }],
      tools: [],
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 1,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'OLD' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'OLD' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('NEW');
  });

  it('I1 keeps live stream text when parallel resync histories return out of order', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({
      kind: 'session.history_resync',
      processEpoch: 1,
      sessionId: 's1',
      reason: 'resync-required',
      historyRequestId: 1,
    });
    store.apply({
      kind: 'session.history_resync',
      processEpoch: 1,
      sessionId: 's1',
      reason: 'resync-required',
      historyRequestId: 2,
    });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'live',
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 2,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'STALE SNAPSHOT' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'STALE SNAPSHOT' }],
      tools: [],
    });
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      historyRequestId: 1,
      messages: [{ messageId: 'm1', role: 'assistant', text: 'OLDER' }],
      timeline: [{ kind: 'assistant', messageId: 'm1', text: 'OLDER' }],
      tools: [],
    });
    expect(store.snapshot().messages[0]?.text).toBe('live');
  });

  it('I1 studio resync path tags hydrate responses and rejects stale out-of-order history', async () => {
    const store = new FactStore('svc');
    let adapter!: TalosStudioAdapter;
    let messagesCall = 0;
    let releaseFirstHydrate: (() => void) | undefined;
    const rpc = new StudioJsonRpcClient(
      () => {},
      (method, params) => adapter.handleNotification(method, params),
    );
    adapter = TalosStudioAdapter.attach(rpc, 1, (event) => {
      store.apply(event);
    });
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    vi.spyOn(rpc, 'request').mockImplementation(async (method) => {
      if (method !== 'session/messages') return { messages: [], hasMore: false };
      messagesCall += 1;
      if (messagesCall === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstHydrate = resolve;
        });
        return {
          messages: [{ id: 'm1', role: 'assistant', content: 'OLD' }],
          hasMore: false,
        };
      }
      return {
        messages: [{ id: 'm1', role: 'assistant', content: 'NEW' }],
        hasMore: false,
      };
    });
    adapter.handleNotification('turn/event', {
      sessionId: 's1',
      event: { type: 'resync-required' },
    });
    adapter.handleNotification('turn/event', {
      sessionId: 's1',
      event: { type: 'resync-required' },
    });
    await vi.waitFor(() => expect(store.snapshot().messages[0]?.text).toBe('NEW'));
    releaseFirstHydrate?.();
    await vi.waitFor(() => expect(messagesCall).toBe(2));
    expect(store.snapshot().messages[0]?.text).toBe('NEW');
    adapter.close();
  });

  it('G2 drops late stream events after the turn has finished', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'turn.started', processEpoch: 1, sessionId: 's1', turnId: 't1', prompt: 'hi' });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'live',
      turnId: 't1',
    });
    store.apply({
      kind: 'turn.finished',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      stopReason: 'end_turn',
    });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'late',
      turnId: 't1',
    });
    store.apply({
      kind: 'tool.update',
      processEpoch: 1,
      sessionId: 's1',
      toolCallId: 'tool-late',
      patch: { title: 'read_file' },
      turnId: 't1',
    });
    store.apply({
      kind: 'stream.notice',
      processEpoch: 1,
      sessionId: 's1',
      noticeId: 'n-late',
      text: 'plan.updated: late',
      turnId: 't1',
    });
    expect(store.snapshot().messages[0]?.text).toBe('live');
    expect(store.snapshot().tools).toEqual([]);
    expect(store.snapshot().timeline.some((item) => item.kind === 'notice')).toBe(false);
  });

  it('H2 rejects late turn.finished for a previous turn while a new turn is running', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'turn.started', processEpoch: 1, sessionId: 's1', turnId: 't1', prompt: 'a' });
    store.apply({ kind: 'turn.started', processEpoch: 1, sessionId: 's1', turnId: 't2', prompt: 'b' });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm2',
      text: 'current',
      turnId: 't2',
    });
    store.apply({
      kind: 'turn.finished',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      stopReason: 'end_turn',
    });
    const snap = store.snapshot();
    expect(snap.turn).toMatchObject({ status: 'running', turnId: 't2' });
    expect(snap.messages[0]?.text).toBe('current');
  });

  it('H2 rejects duplicate terminal turn.finished for the same turn', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'turn.started', processEpoch: 1, sessionId: 's1', turnId: 't1', prompt: 'hi' });
    store.apply({
      kind: 'turn.finished',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      stopReason: 'end_turn',
    });
    store.apply({
      kind: 'turn.finished',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      stopReason: 'end_turn',
    });
    expect(store.snapshot().turn).toMatchObject({ status: 'completed', turnId: 't1' });
  });

  it('G2 drops stream events from a previous turn after a new turn completed', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
    store.apply({ kind: 'turn.started', processEpoch: 1, sessionId: 's1', turnId: 't1', prompt: 'a' });
    store.apply({
      kind: 'turn.finished',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      stopReason: 'end_turn',
    });
    store.apply({ kind: 'turn.started', processEpoch: 1, sessionId: 's1', turnId: 't2', prompt: 'b' });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm2',
      text: 'current',
      turnId: 't2',
    });
    store.apply({
      kind: 'turn.finished',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't2',
      stopReason: 'end_turn',
    });
    store.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'stale',
      turnId: 't1',
    });
    expect(store.snapshot().messages.map((message) => message.text)).toEqual(['current']);
  });

  it('F6 keeps slash.completed messages and timeline consistent', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({
      kind: 'slash.completed',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'u1',
      replyId: 'a1',
      command: '/status',
      output: 'OK',
    });
    const snap = store.snapshot();
    expect(snap.messages).toEqual([
      { messageId: 'u1', role: 'user', text: '/status' },
      { messageId: 'a1', role: 'assistant', text: 'OK' },
    ]);
    expect(snap.timeline.filter((item) => item.kind === 'assistant')).toEqual([
      { kind: 'assistant', messageId: 'a1', segmentIndex: 0, text: 'OK' },
    ]);
  });

  it('continues assistant deltas after a stream notice on the timeline', () => {
    const store = new FactStore('svc');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: '/tmp' });
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
