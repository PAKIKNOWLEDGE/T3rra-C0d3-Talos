import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type SessionBinding = {
  sessionId: string;
  cwd: string;
  updatedAt: string;
};

function bindingPath(workspaceDir: string) {
  return join(workspaceDir, '.talos', 'gui-session.json');
}

export function readSessionBinding(workspaceDir: string): SessionBinding | undefined {
  const path = bindingPath(workspaceDir);
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as SessionBinding;
    if (typeof parsed.sessionId === 'string' && typeof parsed.cwd === 'string') return parsed;
  } catch {
    return undefined;
  }
  return undefined;
}

export function writeSessionBinding(workspaceDir: string, binding: Omit<SessionBinding, 'updatedAt'>) {
  const path = bindingPath(workspaceDir);
  mkdirSync(dirname(path), { recursive: true });
  const payload: SessionBinding = { ...binding, updatedAt: new Date().toISOString() };
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
