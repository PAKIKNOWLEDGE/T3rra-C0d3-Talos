import type { BackgroundTaskFact, GoalStatusFact } from '../core/types.js';

export function parseBackgroundTasks(raw: unknown): BackgroundTaskFact[] {
  if (!raw || typeof raw !== 'object') return [];
  const tasks = (raw as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks)) return [];
  const out: BackgroundTaskFact[] = [];
  for (const row of tasks) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const taskId = typeof record.taskId === 'string' ? record.taskId : '';
    const kind = typeof record.kind === 'string' ? record.kind : 'custom';
    const status = typeof record.status === 'string' ? record.status : 'unknown';
    if (!taskId) continue;
    out.push({
      taskId,
      kind,
      status,
      ...(typeof record.description === 'string' ? { description: record.description } : {}),
    });
  }
  return out;
}

export function parseInstalledPlugins(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const plugins = (raw as { plugins?: unknown }).plugins;
  if (!Array.isArray(plugins)) return [];
  const names: string[] = [];
  for (const row of plugins) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const name =
      typeof record.name === 'string'
        ? record.name
        : typeof record.id === 'string'
          ? record.id
          : '';
    if (name) names.push(name);
  }
  return names;
}

export function parseGoalStatus(raw: unknown, disabled: boolean): GoalStatusFact {
  if (disabled) return { available: false };
  if (!raw || typeof raw !== 'object') return { available: true };
  const goal = (raw as { goal?: unknown }).goal;
  if (!goal || typeof goal !== 'object') return { available: true };
  const record = goal as Record<string, unknown>;
  return {
    available: true,
    ...(typeof record.objective === 'string' ? { objective: record.objective } : {}),
    ...(typeof record.status === 'string' ? { status: record.status } : {}),
  };
}

export function formatDelegationSummary(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const snapshot = (raw as { snapshot?: unknown }).snapshot;
  if (!snapshot || typeof snapshot !== 'object') return undefined;
  const record = snapshot as Record<string, unknown>;
  const status = typeof record.status === 'string' ? record.status : '';
  const agent = typeof record.agentName === 'string' ? record.agentName : '';
  const parts = [agent, status].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export function formatContextSnapshotLabel(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const snapshot = (raw as { snapshot?: unknown }).snapshot;
  if (!snapshot || typeof snapshot !== 'object') return undefined;
  const usage = (snapshot as { contextUsage?: { usedTokens?: number; contextWindowTokens?: number } })
    .contextUsage;
  if (!usage) return undefined;
  const used = usage.usedTokens;
  const window = usage.contextWindowTokens;
  if (used == null || window == null) return undefined;
  return `上下文 ${used.toLocaleString()} / ${window.toLocaleString()}`;
}
