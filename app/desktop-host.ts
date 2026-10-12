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

export async function desktopServiceOrigin(): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  for (let attempt = 0; attempt < 120; attempt++) {
    const status = await invoke<{ origin?: string; error?: string }>('desktop_service_status');
    if (status.error) throw new Error(status.error);
    if (status.origin) return status.origin;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('桌面服务启动超时，请重新启动 TALOS。');
}
