import { describe, expect, it, vi } from 'vitest';
import { FactStore } from '../src/core/fact-store.js';
import { TalosStudioAdapter } from '../src/adapter/talos-studio.js';
import { StudioJsonRpcClient } from '../src/adapter/studio-jsonrpc.js';

function createAdapter() {
  const lines: string[] = [];
  const events: unknown[] = [];
  const store = new FactStore('band0');
  let adapter!: TalosStudioAdapter;
  const rpc = new StudioJsonRpcClient(
    (line) => lines.push(line),
    (method, params) => adapter.handleNotification(method, params),
  );
  adapter = TalosStudioAdapter.attach(rpc, 1, (event) => {
    events.push(event);
    store.apply(event);
  });
  return { rpc, adapter, events, store, lines };
}

describe('band 0 studio contract', () => {
  it('loadSession hydrates history via session/messages', async () => {
    const { rpc, adapter, store } = createAdapter();
    const request = vi.spyOn(rpc, 'request');
    request.mockImplementation(async (method) => {
      if (method === 'session/load') return { session: { sessionId: 's1' } };
      if (method === 'commands/list') return { commands: [] };
      if (method === 'session/messages') {
        return {
          messages: [{ id: 'u1', role: 'user', content: 'hi' }],
          hasMore: false,
        };
      }
      if (method === 'inspection/usage') return { usage: {} };
      if (method === 'inspection/context') return { snapshot: {} };
      if (method === 'session/activeRun') return { activeRun: null };
      if (method === 'questionnaire/getPending') return {};
      if (method === 'questionnaire/getPlanReview') return {};
      if (method === 'queue/list') return { items: [] };
      if (method === 'inspection/skills') return { skills: [] };
      if (method === 'inspection/mcp') return { servers: [] };
      if (method === 'inspection/diagnostics') return { diagnostics: {} };
      if (method === 'session/inputSummaries') return { summaries: [] };
      if (method === 'workspace/git') return { metadata: {} };
      if (method === 'inspection/instructionSources') return { sources: [] };
      if (method === 'inspection/projectMcp') return { preview: { servers: [] } };
      if (method === 'inspection/context') return { snapshot: {} };
      if (method === 'backgroundTasks/list') return { tasks: [] };
      if (method === 'plugins/listInstalled') return { plugins: [] };
      if (method === 'goal/get') throw new Error('Goal feature is disabled.');
      if (method === 'delegation/get') return { snapshot: {} };
      if (method === 'account/status') {
        return { status: { status: 'ok', authMode: 'api_key', modelSource: 'local' } };
      }
      return {};
    });
    await adapter.loadSession('s1', 'C:\\tmp');
    expect(request).toHaveBeenCalledWith('session/messages', expect.objectContaining({ sessionId: 's1' }));
    expect(store.snapshot().timeline.some((item) => item.kind === 'user')).toBe(true);
    expect(store.snapshot().context.accountStatusLabel).toContain('账号 ok');
    adapter.close();
  });

  it('hydrateSessionHistory emits session.history_error on failure', async () => {
    const { rpc, adapter, store } = createAdapter();
    vi.spyOn(rpc, 'request').mockImplementation(async (method) => {
      if (method === 'session/load') return { session: { sessionId: 's1' } };
      if (method === 'session/messages') throw new Error('rpc down');
      if (method === 'commands/list') return { commands: [] };
      if (method === 'inspection/usage') return { usage: {} };
      if (method === 'inspection/context') return { snapshot: {} };
      if (method === 'session/activeRun') return { activeRun: null };
      if (method === 'questionnaire/getPending') return {};
      if (method === 'questionnaire/getPlanReview') return {};
      if (method === 'queue/list') return { items: [] };
      if (method === 'account/status') return { status: { status: 'ok' } };
      return {};
    });
    await adapter.loadSession('s1', 'C:\\tmp');
    expect(store.snapshot().session.historyLoadError).toBe('rpc down');
    adapter.close();
  });

  it('retrySessionHistory clears error after successful fetch', async () => {
    const { rpc, adapter, store } = createAdapter();
    let messagesFail = true;
    vi.spyOn(rpc, 'request').mockImplementation(async (method) => {
      if (method === 'session/load') return { session: { sessionId: 's1' } };
      if (method === 'session/messages') {
        if (messagesFail) throw new Error('temporary');
        return { messages: [{ id: 'u1', role: 'user', content: 'ok' }], hasMore: false };
      }
      if (method === 'commands/list') return { commands: [] };
      if (method === 'inspection/usage') return { usage: {} };
      if (method === 'inspection/context') return { snapshot: {} };
      if (method === 'session/activeRun') return { activeRun: null };
      if (method === 'questionnaire/getPending') return {};
      if (method === 'questionnaire/getPlanReview') return {};
      if (method === 'queue/list') return { items: [] };
      if (method === 'account/status') return { status: {} };
      return {};
    });
    await adapter.loadSession('s1', 'C:\\tmp');
    expect(store.snapshot().session.historyLoadError).toBe('temporary');
    messagesFail = false;
    await adapter.retrySessionHistory('s1');
    expect(store.snapshot().session.historyLoadError).toBeUndefined();
    expect(store.snapshot().timeline.some((item) => item.kind === 'user')).toBe(true);
    adapter.close();
  });

  it('resumeSession uses session/resume RPC', async () => {
    const { rpc, adapter } = createAdapter();
    const request = vi.spyOn(rpc, 'request');
    request.mockImplementation(async (method) => {
      if (method === 'session/resume') return { session: { sessionId: 's1' } };
      if (method === 'commands/list') return { commands: [] };
      if (method === 'session/messages') return { messages: [], hasMore: false };
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
    });
    await adapter.resumeSession('s1', 'C:\\tmp');
    expect(request).toHaveBeenCalledWith('session/resume', { sessionId: 's1' });
    adapter.close();
  });

  it('close detaches with session/close when attached', async () => {
    const { rpc, adapter } = createAdapter();
    const request = vi.spyOn(rpc, 'request');
    request.mockImplementation(async (method) => {
      if (method === 'session/resume') return { session: { sessionId: 's1' } };
      if (method === 'session/close') return {};
      if (method === 'commands/list') return { commands: [] };
      if (method === 'session/messages') return { messages: [], hasMore: false };
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
    });
    await adapter.resumeSession('s1', 'C:\\tmp');
    adapter.close();
    expect(request).toHaveBeenCalledWith('session/close', { sessionId: 's1' });
  });

  it('executeSlash does not call turn/start', async () => {
    const { rpc, adapter } = createAdapter();
    const request = vi.spyOn(rpc, 'request');
    request.mockImplementation(async (method) => {
      if (method === 'commands/list') return { commands: [{ name: 'model', description: 'Model' }] };
      if (method === 'models/list') return { models: [] };
      return {};
    });
    await adapter.executeSlash('s1', 'model', '');
    expect(request).not.toHaveBeenCalledWith('turn/start', expect.anything());
    adapter.close();
  });
});
