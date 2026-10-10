import { describe, expect, it, vi } from 'vitest';
import { FactStore } from '../src/core/fact-store.js';
import { TalosStudioAdapter } from '../src/adapter/talos-studio.js';
import { StudioJsonRpcClient } from '../src/adapter/studio-jsonrpc.js';

function mockAuxiliaryRpc(method: string) {
  if (method === 'session/messages') {
    return { messages: [{ id: 'u2', role: 'user', content: 'edited' }], hasMore: false };
  }
  if (method === 'commands/list') return { commands: [] };
  if (method === 'inspection/usage') return { usage: {} };
  if (method === 'inspection/context') return { snapshot: {} };
  if (method === 'session/activeRun') return { activeRun: null };
  if (method === 'questionnaire/getPending') return {};
  if (method === 'questionnaire/getPlanReview') return {};
  if (method === 'queue/list') return { items: [] };
  if (method === 'account/status') return { status: {} };
  if (method === 'inspection/skills') return { skills: [] };
  if (method === 'inspection/mcp') return { servers: [] };
  if (method === 'inspection/diagnostics') return { diagnostics: {} };
  if (method === 'session/inputSummaries') return { summaries: [] };
  if (method === 'workspace/git') return { metadata: {} };
  if (method === 'inspection/instructionSources') return { sources: [] };
  if (method === 'inspection/projectMcp') return { preview: { servers: [] } };
  if (method === 'backgroundTasks/list') return { tasks: [] };
  if (method === 'plugins/listInstalled') return { plugins: [] };
  if (method === 'goal/get') throw new Error('Goal feature is disabled.');
  if (method === 'delegation/get') return { snapshot: {} };
  return {};
}

function createAdapter() {
  const store = new FactStore('band4');
  let adapter!: TalosStudioAdapter;
  const rpc = new StudioJsonRpcClient(
    () => {},
    (method, params) => adapter.handleNotification(method, params),
  );
  adapter = TalosStudioAdapter.attach(rpc, 1, (event) => {
    store.apply(event);
  });
  return { rpc, adapter, store };
}

describe('band 4 session surgery', () => {
  it('editSessionMessage calls session/editMessage then session/messages', async () => {
    const { rpc, adapter, store } = createAdapter();
    const request = vi.spyOn(rpc, 'request');
    request.mockImplementation(async (method) => {
      if (method === 'session/editMessage') return {};
      return mockAuxiliaryRpc(method);
    });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:\\w' });
    await adapter.editSessionMessage('s1', 'u1', 'edited');
    expect(request).toHaveBeenCalledWith(
      'session/editMessage',
      expect.objectContaining({ sessionId: 's1', userMessageId: 'u1', content: 'edited' }),
    );
    expect(request).toHaveBeenCalledWith('session/messages', expect.objectContaining({ sessionId: 's1' }));
    expect(store.snapshot().timeline.some((row) => row.kind === 'user')).toBe(true);
    adapter.close();
  });

  it('rewindSession calls session/rewind then refreshes history', async () => {
    const { rpc, adapter, store } = createAdapter();
    const request = vi.spyOn(rpc, 'request');
    request.mockImplementation(async (method) => {
      if (method === 'session/rewind') return {};
      return mockAuxiliaryRpc(method);
    });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:\\w' });
    await adapter.rewindSession('s1', 'u1');
    expect(request).toHaveBeenCalledWith(
      'session/rewind',
      expect.objectContaining({ sessionId: 's1', userMessageId: 'u1' }),
    );
    expect(request).toHaveBeenCalledWith('session/messages', expect.objectContaining({ sessionId: 's1' }));
    adapter.close();
  });

});
