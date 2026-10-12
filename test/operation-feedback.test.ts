import { describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { rejectAllPendingOperations } from '../src/client/pending-operations.js';
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

describe('operation feedback (r2-b)', () => {
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

  it('reply_approval dispatch rejects when engine rejects and keeps approval pending', async () => {
    const engine = engineStub({
      replyApproval: vi.fn(async () => {
        throw new Error('permission rpc failed');
      }),
    });
    const service = new TalosService(new FactStore('svc'), engine);
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    service.apply({
      kind: 'approval.requested',
      processEpoch: 1,
      sessionId: 's1',
      approval: {
        requestId: 'perm-1',
        toolCallId: 'tool-1',
        status: 'pending',
        options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }],
      },
    });
    await expect(
      service.dispatch({
        type: 'reply_approval',
        operationId: 'op-approval-1',
        sessionId: 's1',
        requestId: 'perm-1',
        optionId: 'allow',
      }),
    ).rejects.toThrow(/permission rpc failed/);
    expect(service.snapshot().approvals[0]?.status).toBe('pending');
    expect(engine.replyApproval).toHaveBeenCalledOnce();
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
