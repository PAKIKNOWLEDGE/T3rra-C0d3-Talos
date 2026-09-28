import { existsSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { FactStore } from '../core/fact-store.js';
import { startMinimaxProcess } from '../host/minimax-process.js';
import { TalosService, type EnginePort } from './talos-service.js';
import { createTalosWebSocketServer } from './ws-server.js';

export async function startRuntimeService(cwd: string, port = 5194) {
  const workspaceDir = resolve(cwd);
  if (!isAbsolute(workspaceDir) || !existsSync(workspaceDir) || !statSync(workspaceDir).isDirectory()) {
    throw new Error(`Workspace cwd must be an existing absolute directory: ${workspaceDir}`);
  }
  let adapter: Awaited<ReturnType<typeof startMinimaxProcess>>['adapter'] | undefined;
  const engine: EnginePort = {
    sendPrompt: (sessionId, prompt) => {
      if (!adapter) throw new Error('MiniMax adapter is not connected.');
      return adapter.sendPrompt(sessionId, prompt);
    },
    cancel: (sessionId) => {
      if (!adapter) throw new Error('MiniMax adapter is not connected.');
      return adapter.cancel(sessionId);
    },
    replyApproval: async (sessionId, requestId, optionId) => {
      if (!adapter?.replyApproval(sessionId, requestId, optionId)) throw new Error('Approval request is stale or unknown.');
    },
  };
  const service = new TalosService(new FactStore(TalosService.createEpoch()), engine);
  const process = await startMinimaxProcess(1, (event) => service.apply(event));
  adapter = process.adapter;
  await adapter.createSession(workspaceDir);
  const socketServer = createTalosWebSocketServer(service, port);
  return {
    service,
    socketServer,
    initialized: process.initialized,
    stderr: process.stderr,
    close: async () => {
      await socketServer.close();
      process.close();
    },
  };
}
