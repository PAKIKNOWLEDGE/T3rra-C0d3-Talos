import { writeSessionBinding, readSessionBinding } from '../host/session-binding.js';
import type { MinimaxAcpAdapter } from '../adapter/minimax-acp.js';

export async function bindGuiSession(adapter: MinimaxAcpAdapter, workspaceDir: string) {
  const binding = readSessionBinding(workspaceDir);
  if (binding?.cwd === workspaceDir && binding.sessionId) {
    try {
      await adapter.loadSession(binding.sessionId, workspaceDir);
      writeSessionBinding(workspaceDir, { sessionId: binding.sessionId, cwd: workspaceDir });
      try {
        await adapter.listSessions(workspaceDir);
      } catch {
        /* list error already emitted */
      }
      return;
    } catch {
      /* fall through to new session */
    }
  }
  const created = await adapter.createSession(workspaceDir);
  writeSessionBinding(workspaceDir, { sessionId: created.sessionId, cwd: workspaceDir });
  try {
    await adapter.listSessions(workspaceDir);
  } catch {
    /* list error already emitted; keep the bound session */
  }
}
