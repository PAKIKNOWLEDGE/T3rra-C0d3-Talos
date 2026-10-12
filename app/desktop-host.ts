/** Desktop shell hooks (Tauri). No-op in browser dev. */

export function isDesktopShell(): boolean {
  return Boolean((globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export async function pickWorkspaceDirectory(): Promise<string | null> {
  if (!isDesktopShell()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string | null>('pick_workspace_directory');
}

export async function rememberWorkspaceDirectory(cwd: string): Promise<void> {
  if (!isDesktopShell() || !cwd.trim()) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('remember_workspace_directory', { cwd });
}
