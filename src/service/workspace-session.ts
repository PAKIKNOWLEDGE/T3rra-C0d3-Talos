import { writeSessionBinding, readSessionBinding } from '../host/session-binding.js';
import type { TalosStudioAdapter } from '../adapter/talos-studio.js';

export async function bindGuiSession(adapter: TalosStudioAdapter, workspaceDir: string) {
  const binding = readSessionBinding(workspaceDir);
  if (binding?.cwd === workspaceDir && binding.sessionId) {
    try {
      try {
        await adapter.resumeSession(binding.sessionId, workspaceDir);
      } catch {
        await adapter.loadSession(binding.sessionId, workspaceDir);
      }
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
