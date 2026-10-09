import { describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { FactStore } from '../src/core/fact-store.js';
import { TalosService } from '../src/service/talos-service.js';
import { createTalosWebSocketServer } from '../src/service/ws-server.js';

function createService() {
  const calls = { send: 0, cancel: 0, approve: 0 };
  const engine = {
    sendPrompt: vi.fn(async () => void calls.send++),
    cancel: vi.fn(async () => void calls.cancel++),
    replyApproval: vi.fn(async () => void calls.approve++),
    setMode: vi.fn(async () => {}),
    setConfigOption: vi.fn(async () => {}),
    createSession: vi.fn(async () => {}),
    loadSession: vi.fn(async () => {}),
  };
  const service = new TalosService(new FactStore('service-1'), engine);
  return { service, engine, calls };
}

describe('Round 3 fact handling', () => {
  it('merges partial tool updates without clearing existing fields', () => {
    const { service } = createService();
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({
      kind: 'tool.update',
      processEpoch: 1,
      sessionId: 's1',
      toolCallId: 't1',
      patch: { status: 'in_progress', rawInput: { path: 'a.txt' } },
    });
    service.apply({
      kind: 'tool.update',
      processEpoch: 1,
      sessionId: 's1',
      toolCallId: 't1',
      patch: { status: 'completed', rawOutput: 'ok' },
    });
    expect(service.snapshot().tools).toEqual([
      { toolCallId: 't1', status: 'completed', rawInput: { path: 'a.txt' }, rawOutput: 'ok' },
    ]);
  });

  it('ignores late events from an older process epoch', () => {
    const { service } = createService();
    service.apply({ kind: 'connected', processEpoch: 2 });
    service.apply({ kind: 'session.created', processEpoch: 2, sessionId: 'new', cwd: 'C:/new' });
    expect(service.apply({ kind: 'session.created', processEpoch: 1, sessionId: 'old', cwd: 'C:/old' })).toBe(false);
    expect(service.snapshot().session.sessionId).toBe('new');
  });

  it('executes an operationId only once', async () => {
    const { service, calls } = createService();
    const action = { type: 'cancel' as const, operationId: 'op-1', sessionId: 's1' };
    await Promise.all([service.dispatch(action), service.dispatch(action)]);
    expect(calls.cancel).toBe(1);
  });

  it('continues notifying observers after a disconnecting observer is removed', () => {
    const { service } = createService();
    const seen: number[] = [];
    const stop = service.observe((snapshot) => seen.push(snapshot.revision));
    service.apply({ kind: 'connected', processEpoch: 1 });
    stop();
    service.apply({ kind: 'session.created', processEpoch: 1, sessionId: 's1', cwd: 'C:/workspace' });
    expect(seen).toEqual([0, 1]);
  });

  it('serves a full snapshot and de-duplicates websocket actions', async () => {
    const { service, calls } = createService();
    service.apply({ kind: 'connected', processEpoch: 1 });
    const server = createTalosWebSocketServer(service, 0);
    const port = await server.ready;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages: Array<{ type: string; snapshot?: { revision: number } }> = [];
    socket.on('message', (payload) => messages.push(JSON.parse(payload.toString())));
    await new Promise<void>((resolve) => socket.once('open', () => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    socket.send(JSON.stringify({ type: 'cancel', operationId: 'ws-op', sessionId: 's1' }));
    socket.send(JSON.stringify({ type: 'cancel', operationId: 'ws-op', sessionId: 's1' }));
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(messages.some((message) => message.type === 'snapshot')).toBe(true);
    expect(calls.cancel).toBe(1);
    socket.close();
    await server.close();
  });
});
