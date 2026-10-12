import { FactStore } from '../core/fact-store.js';
import { assertWorkspaceDirectory } from '../host/workspace-path.js';
import { startTalosStudioProcess } from '../host/talos-studio-process.js';
import type { TalosStudioAdapter } from '../adapter/talos-studio.js';
import { TalosService, type EnginePort } from './talos-service.js';
import { createTalosWebSocketServer } from './ws-server.js';
import { bindGuiSession } from './workspace-session.js';
import { writeSessionBinding } from '../host/session-binding.js';

type StudioBundle = Awaited<ReturnType<typeof startTalosStudioProcess>>;

export type RuntimeServiceOptions = {
  /** When true, omit or invalid initial cwd keeps WS up until switch_workspace. */
  allowDeferredWorkspace?: boolean;
  staticRoot?: string;
  authToken?: string;
};

export async function startRuntimeService(
  initialCwd: string,
  port = 5194,
  options?: RuntimeServiceOptions,
) {
  let workspaceDir: string | undefined;
  let initialDirectoryError: string | undefined;
  if (initialCwd.trim()) {
    try {
      workspaceDir = assertWorkspaceDirectory(initialCwd);
    } catch (error) {
      if (!options?.allowDeferredWorkspace) throw error;
      initialDirectoryError = error instanceof Error ? error.message : String(error);
    }
  } else if (!options?.allowDeferredWorkspace) {
    throw new Error('工作区必须是绝对路径，例如 C:\\Projects\\my-repo');
  }
  let processEpoch = 1;
  let studioBundle: StudioBundle | undefined;
  let adapter: TalosStudioAdapter | undefined;

  const store = new FactStore(TalosService.createEpoch());
  const engine: EnginePort = {
    sendPrompt: (sessionId, prompt) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.sendPrompt(sessionId, prompt);
    },
    executeSlash: (sessionId, name, input) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.executeSlash(sessionId, name, input);
    },
    cancel: (sessionId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.cancel(sessionId);
    },
    replyApproval: async (sessionId, requestId, optionId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      await adapter.replyApproval(sessionId, requestId, optionId);
    },
    setMode: (sessionId, modeId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.setMode(sessionId, modeId);
    },
    setConfigOption: (sessionId, configId, value) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.setConfigOption(sessionId, configId, value);
    },
    createSession: async (cwd) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      const created = await adapter.createSession(cwd);
      writeSessionBinding(cwd, { sessionId: created.sessionId, cwd });
      try {
        await adapter.listSessions(cwd);
      } catch {
        /* list error already emitted */
      }
    },
    loadSession: async (sessionId, cwd) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      await adapter.loadSession(sessionId, cwd);
      writeSessionBinding(cwd, { sessionId, cwd });
      try {
        await adapter.listSessions(cwd);
      } catch {
        /* list error already emitted */
      }
    },
    deleteSession: async (sessionId, cwd) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      await adapter.deleteSession(sessionId);
      try {
        await adapter.listSessions(cwd);
      } catch {
        /* list error already emitted */
      }
    },
    renameSession: async (sessionId, title, cwd) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      await adapter.renameSession(sessionId, title, cwd);
    },
    archiveSession: async (sessionId, archived, cwd) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      await adapter.archiveSession(sessionId, archived, cwd);
    },
    replyQuestionnaire: (sessionId, requestId, answers) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.replyQuestionnaire(sessionId, requestId, answers);
    },
    dismissQuestionnaire: (sessionId, requestId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.dismissQuestionnaire(sessionId, requestId);
    },
    searchWorkspaceFiles: (cwd, query) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.searchWorkspaceFiles(cwd, query);
    },
    listWorkspaceFiles: (cwd, path) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.listWorkspaceFiles(cwd, path);
    },
    steerTurn: (sessionId, text) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.steerTurn(sessionId, text);
    },
    enqueueMessage: (sessionId, text) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.enqueueMessage(sessionId, text);
    },
    deleteQueueItem: (sessionId, itemId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.deleteQueueItem(sessionId, itemId);
    },
    continueQueue: (sessionId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.continueQueue(sessionId);
    },
    previewRewind: (sessionId, userMessageId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.previewRewind(sessionId, userMessageId);
    },
    rewindSession: (sessionId, userMessageId, rewindTurnDiff) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.rewindSession(sessionId, userMessageId, rewindTurnDiff);
    },
    steerQueueItem: (sessionId, itemId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.steerQueueItem(sessionId, itemId);
    },
    getForkOptions: (sessionId, assistantMessageId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.getForkOptions(sessionId, assistantMessageId);
    },
    forkSession: (sessionId, cwd, assistantMessageId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.forkSession(sessionId, cwd, assistantMessageId);
    },
    editSessionMessage: (sessionId, userMessageId, content) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.editSessionMessage(sessionId, userMessageId, content);
    },
    updateQueueItem: (sessionId, itemId, text) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.updateQueueItem(sessionId, itemId, text);
    },
    retrySessionHistory: (sessionId) => {
      if (!adapter) throw new Error('Talos studio adapter is not connected.');
      return adapter.retrySessionHistory(sessionId);
    },
  };

  const applyStudioCapabilities = () => {
    service.apply({
      kind: 'agent.capabilities',
      processEpoch,
      sessionDelete: true,
    });
  };

  let service!: TalosService;

  const switchWorkspace = async (cwd: string) => {
    const nextDir = assertWorkspaceDirectory(cwd);
    const current = store.snapshot();
    if (current.session.cwd === nextDir && current.session.sessionId) return;

    service.prepareWorkspaceSwitch(processEpoch + 1);
    studioBundle?.close();
    studioBundle = undefined;
    adapter = undefined;
    processEpoch += 1;
    try {
      studioBundle = await startTalosStudioProcess(processEpoch, nextDir, (event) => service.apply(event));
      adapter = studioBundle.adapter;
      applyStudioCapabilities();
      await bindGuiSession(adapter, nextDir);
    } catch (error) {
      service.apply({
        kind: 'error',
        processEpoch,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  service = new TalosService(store, engine, { switchWorkspace });
  if (initialDirectoryError) service.apply({ kind: 'error', processEpoch, message: initialDirectoryError });

  const socketServer = createTalosWebSocketServer(service, port, {
    ...(options?.staticRoot ? { staticRoot: options.staticRoot } : {}),
    ...(options?.authToken ? { authToken: options.authToken } : {}),
  });
  const listenPort = await socketServer.ready;

  const connectStudio = async (dir: string) => {
    studioBundle = await startTalosStudioProcess(processEpoch, dir, (event) => service.apply(event));
    adapter = studioBundle.adapter;
    applyStudioCapabilities();
    await bindGuiSession(adapter, dir);
  };

  try {
    if (workspaceDir) {
      try {
        await connectStudio(workspaceDir);
      } catch (error) {
        service.apply({
          kind: 'error',
          processEpoch,
          message: error instanceof Error ? error.message : String(error),
        });
        if (!options?.allowDeferredWorkspace) throw error;
      }
    }
    return {
      service,
      socketServer,
      listenPort,
      switchWorkspace,
      initialized: studioBundle?.initialized,
      stderr: studioBundle?.stderr ?? [],
      close: async () => {
        await socketServer.close();
        studioBundle?.close();
      },
    };
  } catch (error) {
    studioBundle?.close();
    await socketServer.close();
    throw error;
  }
}
