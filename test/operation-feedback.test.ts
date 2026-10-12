import { describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { TalosStudioAdapter } from '../src/adapter/talos-studio.js';
import { StudioJsonRpcClient } from '../src/adapter/studio-jsonrpc.js';
import {
  clearApprovalFlightIfCurrent,
  clearStopFlightIfCurrent,
  createOperationWaitContext,
  isOperationWaitContextCurrent,
  rejectAllPendingOperations,
  routeActionError,
  tryRegisterApprovalFlight,
} from '../src/client/pending-operations.js';
import { FactStore } from '../src/core/fact-store.js';
import { TalosService } from '../src/service/talos-service.js';
import { createTalosWebSocketServer } from '../src/service/ws-server.js';

function engineStub(overrides: Record<string, unknown> = {}) {
  return {
    sendPrompt: vi.fn(async () => {}),
    executeSlash: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    replyApproval: vi.fn(async () => {}),
    setMode: vi.fn(async () => {}),
    setConfigOption: vi.fn(async () => {}),
    createSession: vi.fn(async () => {}),
    loadSession: vi.fn(async () => {}),
    deleteSession: vi.fn(async () => {}),
    renameSession: vi.fn(async () => {}),
    archiveSession: vi.fn(async () => {}),
    replyQuestionnaire: vi.fn(async () => {}),
    dismissQuestionnaire: vi.fn(async () => {}),
    searchWorkspaceFiles: vi.fn(async () => []),
    listWorkspaceFiles: vi.fn(async () => []),
    steerTurn: vi.fn(async () => {}),
    enqueueMessage: vi.fn(async () => {}),
    deleteQueueItem: vi.fn(async () => {}),
    continueQueue: vi.fn(async () => {}),
    previewRewind: vi.fn(async () => 'preview'),
    rewindSession: vi.fn(async () => {}),
    steerQueueItem: vi.fn(async () => {}),
    getForkOptions: vi.fn(async () => ({ canFork: false })),
    forkSession: vi.fn(async () => 's2'),
    editSessionMessage: vi.fn(async () => {}),
    updateQueueItem: vi.fn(async () => {}),
    retrySessionHistory: vi.fn(async () => {}),
    ...overrides,
  };
}

function createStudioAdapterHarness() {
  const events: unknown[] = [];
  const store = new FactStore('approval-adapter');
  let adapter!: TalosStudioAdapter;
  const rpc = new StudioJsonRpcClient(
    () => {},
    (method, params) => adapter.handleNotification(method, params),
  );
  adapter = TalosStudioAdapter.attach(rpc, 1, (event) => {
    events.push(event);
    store.apply(event);
  });
  return { rpc, adapter, events, store };
}

describe('operation feedback (r2-b)', () => {
  it('routes an awaited error only to its consumer and ignores its late duplicate', async () => {
    const pending = new Map();
    const context = createOperationWaitContext('approval-old', 's1', 1);
    const notices: string[] = [];
    const result = new Promise((resolve, reject) => {
      pending.set(context.operationId, { resolve, reject });
    }).catch((error: Error) => {
      if (isOperationWaitContextCurrent(context, { sessionId: 's2', connectionToken: 1 })) {
        notices.push(error.message);
      }
    });
    const otherReject = vi.fn();
    pending.set('approval-new', { resolve: vi.fn(), reject: otherReject });
    expect(routeActionError(pending, 'approval-old', 'old failure')).toBe('consumer');
    await result;
    expect(notices).toEqual([]);
    expect(pending.has('approval-new')).toBe(true);
    expect(otherReject).not.toHaveBeenCalled();
    expect(routeActionError(pending, 'approval-old', 'late duplicate')).toBe('ignored');
  });

  it('only workspace errors request workspace control recovery', () => {
    const pending = new Map();
    expect(routeActionError(pending, 'workspace-1', 'failed')).toBe('workspace');
    expect(routeActionError(pending, 'load-session-1', 'failed')).toBe('untracked');
    expect(routeActionError(pending, undefined, 'bad input')).toBe('untracked');
    expect(routeActionError(pending, 'cancel-old', 'late failure')).toBe('ignored');
  });

  it('rejectAllPendingOperations rejects every waiter and clears the map', async () => {
    const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    const outcomes: string[] = [];
    pending.set('op-a', {
      resolve: () => outcomes.push('resolve-a'),
      reject: (error) => outcomes.push(`reject-a:${error.message}`),
    });
    pending.set('op-b', {
      resolve: () => outcomes.push('resolve-b'),
      reject: (error) => outcomes.push(`reject-b:${error.message}`),
    });
    rejectAllPendingOperations(pending, '连接已断开');
    expect(pending.size).toBe(0);
    expect(outcomes).toEqual(['reject-a:连接已断开', 'reject-b:连接已断开']);
  });

  it('approval flight helpers dedupe, retry, and clear only matching operation', () => {
    const flights = new Map();
    const first = createOperationWaitContext('op-1', 's1', 1);
    const second = createOperationWaitContext('op-2', 's1', 1);
    expect(tryRegisterApprovalFlight(flights, 'perm-1', first)).toBe(true);
    expect(tryRegisterApprovalFlight(flights, 'perm-1', second)).toBe(false);
    clearApprovalFlightIfCurrent(flights, 'perm-1', 'op-1');
    expect(flights.size).toBe(0);
    expect(tryRegisterApprovalFlight(flights, 'perm-1', second)).toBe(true);
    clearApprovalFlightIfCurrent(flights, 'perm-1', 'op-stale');
    expect(flights.get('perm-1')).toEqual(second);
    clearApprovalFlightIfCurrent(flights, 'perm-1', 'op-2');
    expect(flights.size).toBe(0);
  });

  it('stop flight helper clears only the matching operation', () => {
    const flight = createOperationWaitContext('stop-1', 's1', 2);
    expect(clearStopFlightIfCurrent(flight, 'stop-other')).toEqual(flight);
    expect(clearStopFlightIfCurrent(flight, 'stop-1')).toBeUndefined();
  });

  it('operation wait context ignores stale session or connection token', () => {
    const context = createOperationWaitContext('op-1', 's1', 3);
    expect(isOperationWaitContextCurrent(context, { sessionId: 's1', connectionToken: 3 })).toBe(true);
    expect(isOperationWaitContextCurrent(context, { sessionId: 's2', connectionToken: 3 })).toBe(false);
    expect(isOperationWaitContextCurrent(context, { sessionId: 's1', connectionToken: 4 })).toBe(false);
  });

  it('TalosStudioAdapter.replyApproval keeps connection on RPC reject and settles on retry', async () => {
    const { rpc, adapter, events, store } = createStudioAdapterHarness();
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    store.apply({
      kind: 'turn.started',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      prompt: 'hi',
    });
    let replyCalls = 0;
    vi.spyOn(rpc, 'request').mockImplementation(async (method) => {
      if (method === 'permission/list') {
        return {
          permissions: [
            {
              requestId: 'perm-1',
              sessionId: 's1',
              agentName: 'agent',
            },
          ],
        };
      }
      if (method === 'permission/reply') {
        replyCalls += 1;
        if (replyCalls === 1) throw new Error('permission RPC rejected');
        return {};
      }
      return {};
    });
    await (adapter as unknown as { pollPermissions(): Promise<void> }).pollPermissions();
    const before = store.snapshot();
    expect(before.approvals[0]?.status).toBe('pending');

    await expect(adapter.replyApproval('s1', 'perm-1', 'allowOnce')).rejects.toThrow(
      'permission RPC rejected',
    );
    const afterReject = store.snapshot();
    expect(afterReject.connection.status).toBe('connected');
    expect(afterReject.approvals[0]?.status).toBe('pending');
    expect(afterReject.session).toEqual(before.session);
    expect(afterReject.turn).toEqual(before.turn);
    expect(afterReject.errors).toEqual([]);
    expect(events.filter((event) => (event as { kind?: string }).kind === 'error')).toHaveLength(0);
    expect(events.filter((event) => (event as { kind?: string }).kind === 'approval.settled')).toHaveLength(
      0,
    );

    await adapter.replyApproval('s1', 'perm-1', 'allowOnce');
    expect(replyCalls).toBe(2);
    expect(store.snapshot().approvals[0]?.status).toBe('settled');
    expect(events.filter((event) => (event as { kind?: string }).kind === 'approval.settled')).toHaveLength(
      1,
    );

    await expect(adapter.replyApproval('s1', 'perm-1', 'allowOnce')).rejects.toThrow(/stale/i);
    expect(replyCalls).toBe(2);
    adapter.close();
  });

  it('websocket action_error includes operationId when dispatch fails', async () => {
    const engine = engineStub({
      cancel: vi.fn(async () => {
        throw new Error('stop failed');
      }),
    });
    const service = new TalosService(new FactStore('ws'), engine);
    service.apply({ kind: 'connected', processEpoch: 1 });
    const server = createTalosWebSocketServer(service, 0);
    const port = await server.ready;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const payloads: Array<{ type: string; operationId?: string; message?: string }> = [];
    socket.on('message', (raw) => payloads.push(JSON.parse(raw.toString())));
    await new Promise<void>((resolve) => socket.once('open', () => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    socket.send(JSON.stringify({ type: 'cancel', operationId: 'ws-stop-1', sessionId: 's1' }));
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    const errorFrame = payloads.find((frame) => frame.type === 'action_error');
    expect(errorFrame).toMatchObject({
      type: 'action_error',
      operationId: 'ws-stop-1',
      message: 'stop failed',
    });
    socket.close();
    await server.close();
  });

  it('reply_approval over websocket uses studio adapter without polluting connection', async () => {
    const { rpc, adapter, store } = createStudioAdapterHarness();
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    let replyCalls = 0;
    vi.spyOn(rpc, 'request').mockImplementation(async (method) => {
      if (method === 'permission/list') {
        return {
          permissions: [
            {
              requestId: 'perm-ws',
              sessionId: 's1',
              agentName: 'agent',
            },
          ],
        };
      }
      if (method === 'permission/reply') {
        replyCalls += 1;
        throw new Error('permission rpc failed');
      }
      return {};
    });
    await (adapter as unknown as { pollPermissions(): Promise<void> }).pollPermissions();
    const engine = engineStub({
      replyApproval: (sessionId, requestId, optionId) =>
        adapter.replyApproval(sessionId, requestId, optionId),
    });
    const service = new TalosService(store, engine);
    const server = createTalosWebSocketServer(service, 0);
    const port = await server.ready;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const payloads: Array<{ type: string; operationId?: string; message?: string }> = [];
    socket.on('message', (raw) => payloads.push(JSON.parse(raw.toString())));
    await new Promise<void>((resolve) => socket.once('open', () => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    socket.send(
      JSON.stringify({
        type: 'reply_approval',
        operationId: 'op-approval-ws',
        sessionId: 's1',
        requestId: 'perm-ws',
        optionId: 'allowOnce',
      }),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    const errorFrame = payloads.find((frame) => frame.type === 'action_error');
    expect(errorFrame).toMatchObject({
      type: 'action_error',
      operationId: 'op-approval-ws',
      message: 'permission rpc failed',
    });
    expect(store.snapshot().connection.status).toBe('connected');
    expect(store.snapshot().approvals[0]?.status).toBe('pending');
    expect(replyCalls).toBe(1);
    socket.close();
    await server.close();
    adapter.close();
  });

  it('cancel accepted does not end the running turn', async () => {
    const store = new FactStore('cancel-turn');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    store.apply({
      kind: 'turn.started',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      prompt: 'run',
    });
    const engine = engineStub({
      cancel: vi.fn(async () => {}),
    });
    const service = new TalosService(store, engine);
    const result = await service.dispatch({
      type: 'cancel',
      operationId: 'op-cancel-ok',
      sessionId: 's1',
    });
    expect(result).toMatchObject({ accepted: true, operationId: 'op-cancel-ok' });
    expect(store.snapshot().turn.status).toBe('running');
  });

  it('load_session failure still rolls back session facts', async () => {
    const engine = engineStub({
      loadSession: vi.fn(async () => {
        throw new Error('load failed');
      }),
    });
    const service = new TalosService(new FactStore('svc'), engine);
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({ kind: 'session.created', processEpoch: 1, sessionId: 'keep', cwd: 'C:/w' });
    await expect(
      service.dispatch({
        type: 'load_session',
        operationId: 'op-load-fail',
        sessionId: 'other',
        cwd: 'C:/w',
      }),
    ).rejects.toThrow(/load failed/);
    expect(service.snapshot().session.sessionId).toBe('keep');
  });
});
