import { describe, expect, it, vi } from 'vitest';
import {
  parseSessionIndex,
  nextListCursor,
  mergeSessionPages,
} from '../src/adapter/session-index.js';
import { readSessionDeleteCapability } from '../src/adapter/minimax-acp.js';
import { FactStore } from '../src/core/fact-store.js';
import { TalosService } from '../src/service/talos-service.js';

function engineStub(overrides: Partial<{
  createSession: () => Promise<void>;
  loadSession: () => Promise<void>;
}> = {}) {
  return {
    sendPrompt: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    replyApproval: vi.fn(async () => {}),
    setMode: vi.fn(async () => {}),
    setConfigOption: vi.fn(async () => {}),
    createSession: vi.fn(async () => {}),
    loadSession: vi.fn(async () => {}),
    deleteSession: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('session delete capability', () => {
  it('reads sessionCapabilities.delete from initialize payload', () => {
    expect(readSessionDeleteCapability({ agentCapabilities: { sessionCapabilities: { delete: {} } } })).toBe(
      true,
    );
    expect(readSessionDeleteCapability({ agentCapabilities: { sessionCapabilities: { list: {} } } })).toBe(
      false,
    );
  });
});

describe('session index parsing', () => {
  it('sorts by updatedAt descending and dedupes sessionId', () => {
    const items = parseSessionIndex({
      sessions: [
        { sessionId: 'a', cwd: 'C:/w', updatedAt: '2026-01-01T10:00:00Z' },
        { sessionId: 'b', cwd: 'C:/w', updatedAt: '2026-01-02T10:00:00Z' },
        { sessionId: 'a', cwd: 'C:/w', title: 'dup' },
      ],
    });
    expect(items.map((item) => item.sessionId)).toEqual(['b', 'a']);
    expect(items[1].title).toBeUndefined();
  });

  it('reads nextCursor and merges paginated pages', () => {
    const page1 = { sessions: [{ sessionId: '1', cwd: 'C:/w' }], nextCursor: 'c2' };
    expect(nextListCursor(page1)).toBe('c2');
    const merged = mergeSessionPages([
      page1,
      { sessions: [{ sessionId: '2', cwd: 'C:/w', updatedAt: '2026-01-03T00:00:00Z' }] },
    ]);
    expect(merged.map((item) => item.sessionId)).toEqual(['2', '1']);
  });
});

describe('session directory service', () => {
  it('stores session.listed on snapshot', () => {
    const service = new TalosService(new FactStore('s'), engineStub());
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({
      kind: 'session.listed',
      processEpoch: 1,
      cwd: 'C:/w',
      sessions: [{ sessionId: 's1', cwd: 'C:/w', title: 'One' }],
    });
    expect(service.snapshot().sessions).toEqual([{ sessionId: 's1', cwd: 'C:/w', title: 'One' }]);
    expect(service.snapshot().sessionListError).toBeUndefined();
  });

  it('clears sessions on workspace prepare', () => {
    const service = new TalosService(new FactStore('s'), engineStub());
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({
      kind: 'session.listed',
      processEpoch: 1,
      cwd: 'C:/w',
      sessions: [{ sessionId: 's1', cwd: 'C:/w' }],
    });
    service.prepareWorkspaceSwitch(2);
    expect(service.snapshot().sessions).toEqual([]);
  });

  it('rejects new_session while turn is running', async () => {
    const service = new TalosService(new FactStore('s'), engineStub());
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({ kind: 'session.created', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    service.apply({
      kind: 'turn.started',
      processEpoch: 1,
      sessionId: 's1',
      turnId: 't1',
      prompt: 'go',
    });
    await expect(
      service.dispatch({ type: 'new_session', operationId: 'op-new', cwd: 'C:/w' }),
    ).rejects.toThrow(/还在生成/);
  });

  it('rejects delete_session without engine capability', async () => {
    const service = new TalosService(new FactStore('s'), engineStub());
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({ kind: 'session.created', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    await expect(
      service.dispatch({
        type: 'delete_session',
        operationId: 'op-del',
        sessionId: 's1',
        cwd: 'C:/w',
      }),
    ).rejects.toThrow(/不支持删除/);
  });

  it('dispatches delete_session when capability is advertised', async () => {
    const engine = engineStub();
    const service = new TalosService(new FactStore('s'), engine);
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({ kind: 'agent.capabilities', processEpoch: 1, sessionDelete: true });
    service.apply({ kind: 'session.created', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    service.apply({
      kind: 'session.listed',
      processEpoch: 1,
      cwd: 'C:/w',
      sessions: [
        { sessionId: 's1', cwd: 'C:/w' },
        { sessionId: 's2', cwd: 'C:/w' },
      ],
    });
    await service.dispatch({
      type: 'delete_session',
      operationId: 'op-del',
      sessionId: 's2',
      cwd: 'C:/w',
    });
    expect(engine.deleteSession).toHaveBeenCalledWith('s2', 'C:/w');
    expect(service.snapshot().session.sessionId).toBe('s1');
  });

  it('restores snapshot when load_session fails', async () => {
    const engine = engineStub({
      loadSession: vi.fn(async () => {
        throw new Error('load failed');
      }),
    });
    const service = new TalosService(new FactStore('s'), engine);
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({ kind: 'session.created', processEpoch: 1, sessionId: 'keep', cwd: 'C:/w' });
    service.apply({
      kind: 'user.message',
      processEpoch: 1,
      sessionId: 'keep',
      messageId: 'm1',
      text: 'stay',
    });
    await expect(
      service.dispatch({
        type: 'load_session',
        operationId: 'op-load',
        sessionId: 'other',
        cwd: 'C:/w',
      }),
    ).rejects.toThrow(/load failed/);
    expect(service.snapshot().session.sessionId).toBe('keep');
    expect(service.snapshot().messages).toEqual([
      { messageId: 'm1', role: 'user', text: 'stay' },
    ]);
  });
});
