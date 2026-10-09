import { existsSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export function assertWorkspaceDirectory(cwd: string): string {
  const trimmed = cwd.trim();
  if (!isAbsolute(trimmed)) {
    throw new Error('工作区必须是绝对路径，例如 C:\\Projects\\my-repo');
  }
  const workspaceDir = resolve(trimmed);
  if (!existsSync(workspaceDir) || !statSync(workspaceDir).isDirectory()) {
    throw new Error(`找不到该文件夹：${workspaceDir}`);
  }
  return workspaceDir;
}
