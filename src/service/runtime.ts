import { FactStore } from '../core/fact-store.js';
import { assertWorkspaceDirectory } from '../host/workspace-path.js';
import { startTalosAcpProcess } from '../host/minimax-process.js';
import type { MinimaxAcpAdapter } from '../adapter/minimax-acp.js';
import { TalosService, type EnginePort } from './talos-service.js';
import { createTalosWebSocketServer } from './ws-server.js';
import { bindGuiSession } from './workspace-session.js';
import { writeSessionBinding } from '../host/session-binding.js';

type AcpBundle = Awaited<ReturnType<typeof startTalosAcpProcess>>;

export async function startRuntimeService(initialCwd: string, port = 5194) {
  const workspaceDir = assertWorkspaceDirectory(initialCwd);
  let processEpoch = 1;
  let acpBundle: AcpBundle | undefined;
  let adapter: MinimaxAcpAdapter | undefined;

  const store = new FactStore(TalosService.createEpoch());
  const engine: EnginePort = {
    sendPrompt: (sessionId, prompt) => {
      if (!adapter) throw new Error('Talos ACP adapter is not connected.');
      return adapter.sendPrompt(sessionId, prompt);
    },
    cancel: (sessionId) => {
      if (!adapter) throw new Error('Talos ACP adapter is not connected.');
      return adapter.cancel(sessionId);
    },
    replyApproval: async (sessionId, requestId, optionId) => {
      if (!adapter?.replyApproval(sessionId, requestId, optionId)) {
        throw new Error('Approval request is stale or unknown.');
      }
    },
    setMode: (sessionId, modeId) => {
      if (!adapter) throw new Error('Talos ACP adapter is not connected.');
      return adapter.setMode(sessionId, modeId);
    },
    setConfigOption: (sessionId, configId, value) => {
      if (!adapter) throw new Error('Talos ACP adapter is not connected.');
      return adapter.setConfigOption(sessionId, configId, value);
    },
    createSession: async (cwd) => {
      if (!adapter) throw new Error('Talos ACP adapter is not connected.');
      const created = await adapter.createSession(cwd);
      writeSessionBinding(cwd, { sessionId: created.sessionId, cwd });
      try {
        await adapter.listSessions(cwd);
      } catch {
        /* list error already emitted */
      }
    },
    loadSession: async (sessionId, cwd) => {
      if (!adapter) throw new Error('Talos ACP adapter is not connected.');
      await adapter.loadSession(sessionId, cwd);
      writeSessionBinding(cwd, { sessionId, cwd });
      try {
        await adapter.listSessions(cwd);
      } catch {
        /* list error already emitted */
      }
    },
  };

  let service!: TalosService;

  const switchWorkspace = async (cwd: string) => {
    const nextDir = assertWorkspaceDirectory(cwd);
    const current = store.snapshot();
    if (current.session.cwd === nextDir && current.session.sessionId) return;

    service.prepareWorkspaceSwitch(processEpoch + 1);
    acpBundle?.close();
    processEpoch += 1;
    try {
      acpBundle = await startTalosAcpProcess(processEpoch, (event) => service.apply(event));
      adapter = acpBundle.adapter;
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

  try {
    acpBundle = await startTalosAcpProcess(processEpoch, (event) => service.apply(event));
    adapter = acpBundle.adapter;
    await bindGuiSession(adapter, workspaceDir);
    const socketServer = createTalosWebSocketServer(service, port);
    await socketServer.ready;
    return {
      service,
      socketServer,
      switchWorkspace,
      initialized: acpBundle.initialized,
      stderr: acpBundle.stderr,
      close: async () => {
        await socketServer.close();
        acpBundle?.close();
      },
    };
  } catch (error) {
    acpBundle?.close();
    throw error;
  }
}
