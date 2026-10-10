import { describe, expect, it } from 'vitest';
import { parseForkOptions } from '../src/adapter/studio-fork.js';
import { TalosService } from '../src/service/talos-service.js';
import { FactStore } from '../src/core/fact-store.js';
import { vi } from 'vitest';

describe('studio fork', () => {
  it('parses fork options', () => {
    expect(parseForkOptions({ options: { canFork: true, suggestedTitle: 'Fork 2' } }).canFork).toBe(
      true,
    );
    expect(parseForkOptions({ options: { canFork: false, unavailableReason: 'nope' } }).unavailableReason).toBe(
      'nope',
    );
  });

  it('dispatches fork_session and loads new session', async () => {
    const engine = {
      sendPrompt: vi.fn(),
      executeSlash: vi.fn(),
      cancel: vi.fn(),
      replyApproval: vi.fn(),
      setMode: vi.fn(),
      setConfigOption: vi.fn(),
      createSession: vi.fn(),
      loadSession: vi.fn(async () => {}),
      deleteSession: vi.fn(),
      renameSession: vi.fn(),
      archiveSession: vi.fn(),
      replyQuestionnaire: vi.fn(),
      dismissQuestionnaire: vi.fn(),
      searchWorkspaceFiles: vi.fn(),
      listWorkspaceFiles: vi.fn(async () => []),
      steerTurn: vi.fn(),
      enqueueMessage: vi.fn(),
      deleteQueueItem: vi.fn(),
      continueQueue: vi.fn(),
      previewRewind: vi.fn(),
      rewindSession: vi.fn(),
      steerQueueItem: vi.fn(),
      getForkOptions: vi.fn(async () => ({ canFork: true })),
      forkSession: vi.fn(async () => 's-new'),
      editSessionMessage: vi.fn(),
      updateQueueItem: vi.fn(),
      retrySessionHistory: vi.fn(),
    };
    const service = new TalosService(new FactStore('f'), engine);
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    await service.dispatch({
      type: 'fork_session',
      operationId: 'op-fork',
      sessionId: 's1',
      cwd: 'C:/w',
    });
    expect(engine.forkSession).toHaveBeenCalledWith('s1', 'C:/w', undefined);
    expect(engine.loadSession).toHaveBeenCalledWith('s-new', 'C:/w');
  });
});
