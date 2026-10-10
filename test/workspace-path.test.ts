import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assertWorkspaceDirectory } from '../src/host/workspace-path.js';
import { FactStore } from '../src/core/fact-store.js';
import { TalosService } from '../src/service/talos-service.js';

describe('assertWorkspaceDirectory', () => {
  it('accepts an existing absolute directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'talos-ws-'));
    try {
      expect(assertWorkspaceDirectory(dir)).toBe(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects relative paths', () => {
    expect(() => assertWorkspaceDirectory('relative/path')).toThrow(/绝对路径/);
  });

  it('rejects missing directories', () => {
    expect(() => assertWorkspaceDirectory('C:\\no-such-talos-workspace-dir')).toThrow(/找不到/);
  });
});

describe('workspace switch state', () => {
  it('clears messages when preparing for a new workspace', () => {
    const engine = {
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
      listWorkspaceFiles: async () => [],
    };
    const service = new TalosService(new FactStore('s'), engine);
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({
      kind: 'user.message',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'm1',
      text: 'hello',
    });
    service.prepareWorkspaceSwitch(2);
    expect(service.snapshot().messages).toEqual([]);
    expect(service.snapshot().connection.processEpoch).toBe(2);
    expect(service.snapshot().connection.status).toBe('connecting');
  });

  it('dispatches switch_workspace to host', async () => {
    let seen = '';
    const service = new TalosService(
      new FactStore('s'),
      {
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
      listWorkspaceFiles: async () => [],
      },
      { switchWorkspace: async (cwd) => void (seen = cwd) },
    );
    await service.dispatch({ type: 'switch_workspace', operationId: 'op-1', cwd: 'C:\\tmp' });
    expect(seen).toBe('C:\\tmp');
  });
});
