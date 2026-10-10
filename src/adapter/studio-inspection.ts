import type { GoalStatusFact, InspectionFact, InputSummaryFact, QueueItemFact } from '../core/types.js';
import {
  formatContextSnapshotLabel,
  formatDelegationSummary,
  parseBackgroundTasks,
  parseGoalStatus,
  parseInstalledPlugins,
} from './studio-band5.js';

export function parseQueueItems(raw: unknown): QueueItemFact[] {
  if (!raw || typeof raw !== 'object') return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const out: QueueItemFact[] = [];
  for (const row of items) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const itemId = typeof record.itemId === 'string' ? record.itemId : '';
    const status = typeof record.status === 'string' ? record.status : 'unknown';
    if (!itemId) continue;
    out.push({
      itemId,
      status,
      ...(typeof record.content === 'string' ? { content: record.content } : {}),
    });
  }
  return out;
}

export function parseInputSummaries(raw: unknown): InputSummaryFact[] {
  if (!raw || typeof raw !== 'object') return [];
  const summaries = (raw as { summaries?: unknown }).summaries;
  if (!Array.isArray(summaries)) return [];
  const out: InputSummaryFact[] = [];
  for (const row of summaries) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const userMessageId =
      typeof record.userMessageId === 'string' ? record.userMessageId : '';
    if (!userMessageId) continue;
    out.push({
      userMessageId,
      ...(typeof record.contentHead === 'string' ? { contentHead: record.contentHead } : {}),
      ...(typeof record.timestamp === 'number' ? { timestamp: record.timestamp } : {}),
    });
  }
  return out;
}

export function parseInstructionSources(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const sources = (raw as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) return [];
  const labels: string[] = [];
  for (const row of sources) {
    if (!row || typeof row !== 'object') continue;
    const label =
      typeof (row as { label?: string }).label === 'string'
        ? (row as { label: string }).label
        : typeof (row as { path?: string }).path === 'string'
          ? (row as { path: string }).path
          : '';
    if (label) labels.push(label);
  }
  return labels;
}

export function formatProjectMcpPreview(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const preview = (raw as { preview?: unknown }).preview ?? raw;
  if (!preview || typeof preview !== 'object') return undefined;
  const record = preview as { path?: string; error?: string; servers?: unknown };
  if (record.error) return `错误：${record.error}`;
  const servers = Array.isArray(record.servers) ? record.servers : [];
  const names = servers
    .map((row) => {
      if (!row || typeof row !== 'object') return '';
      const name = typeof (row as { name?: string }).name === 'string' ? (row as { name: string }).name : '';
      const status = typeof (row as { status?: string }).status === 'string' ? (row as { status: string }).status : '';
      return name ? `${name} (${status})` : '';
    })
    .filter(Boolean);
  const head = record.path ? `${record.path}` : 'project MCP';
  if (!names.length) return head;
  return `${head} · ${names.slice(0, 4).join(', ')}`;
}

export function parseInspectionBundle(
  skillsRaw: unknown,
  mcpRaw: unknown,
  diagnosticsRaw: unknown,
  instructionRaw?: unknown,
  projectMcpRaw?: unknown,
  contextRaw?: unknown,
  backgroundRaw?: unknown,
  pluginsRaw?: unknown,
  goalRaw?: unknown,
  goalDisabled?: boolean,
  delegationRaw?: unknown,
): InspectionFact {
  const skillNames: string[] = [];
  if (skillsRaw && typeof skillsRaw === 'object') {
    const skills = (skillsRaw as { skills?: unknown }).skills;
    if (Array.isArray(skills)) {
      for (const row of skills) {
        if (!row || typeof row !== 'object') continue;
        const name =
          typeof (row as { name?: string }).name === 'string'
            ? (row as { name: string }).name
            : typeof (row as { displayName?: string }).displayName === 'string'
              ? (row as { displayName: string }).displayName
              : '';
        if (name) skillNames.push(name);
      }
    }
  }
  const mcpServerNames: string[] = [];
  if (mcpRaw && typeof mcpRaw === 'object') {
    const servers = (mcpRaw as { servers?: unknown }).servers;
    if (Array.isArray(servers)) {
      for (const row of servers) {
        if (!row || typeof row !== 'object') continue;
        const name =
          typeof (row as { name?: string }).name === 'string'
            ? (row as { name: string }).name
            : typeof (row as { displayName?: string }).displayName === 'string'
              ? (row as { displayName: string }).displayName
              : '';
        if (name) mcpServerNames.push(name);
      }
    }
  }
  let diagnosticsSummary: string | undefined;
  if (diagnosticsRaw && typeof diagnosticsRaw === 'object') {
    const diagnostics = (diagnosticsRaw as { diagnostics?: unknown }).diagnostics;
    if (diagnostics && typeof diagnostics === 'object') {
      const status = (diagnostics as { status?: string }).status;
      const version = (diagnostics as { version?: string }).version;
      const parts = [status, version].filter((part) => typeof part === 'string' && part);
      if (parts.length) diagnosticsSummary = parts.join(' · ');
    }
  }
  const instructionSourceLabels = parseInstructionSources(instructionRaw);
  const projectMcpSummary = formatProjectMcpPreview(projectMcpRaw);
  const contextSnapshotLabel = formatContextSnapshotLabel(contextRaw);
  const backgroundTasks = parseBackgroundTasks(backgroundRaw);
  const installedPlugins = parseInstalledPlugins(pluginsRaw);
  const goal: GoalStatusFact = parseGoalStatus(goalRaw, goalDisabled === true);
  const delegationSummary = formatDelegationSummary(delegationRaw);
  return {
    skillNames,
    mcpServerNames,
    ...(diagnosticsSummary ? { diagnosticsSummary } : {}),
    ...(instructionSourceLabels.length ? { instructionSourceLabels } : {}),
    ...(projectMcpSummary ? { projectMcpSummary } : {}),
    ...(contextSnapshotLabel ? { contextSnapshotLabel } : {}),
    ...(backgroundTasks.length ? { backgroundTasks } : {}),
    ...(installedPlugins.length ? { installedPlugins } : {}),
    goal,
    ...(delegationSummary ? { delegationSummary } : {}),
  };
}

export function formatRewindPreviewText(preview: unknown): string {
  if (!preview || typeof preview !== 'object') return '引擎未返回预览内容。';
  const turns = (preview as { turns?: unknown }).turns;
  if (!Array.isArray(turns) || !turns.length) return '回退不会影响文件变更。';
  const lines: string[] = [];
  for (const turn of turns) {
    if (!turn || typeof turn !== 'object') continue;
    const files = (turn as { files?: unknown }).files;
    if (!Array.isArray(files) || !files.length) continue;
    for (const file of files) {
      if (!file || typeof file !== 'object') continue;
      const path = typeof (file as { filePath?: string }).filePath === 'string'
        ? (file as { filePath: string }).filePath
        : '?';
      const action = typeof (file as { action?: string }).action === 'string'
        ? (file as { action: string }).action
        : '';
      lines.push(`${action || 'change'} · ${path}`);
    }
  }
  return lines.length ? lines.join('\n') : '回退将影响对话记录；文件变更见引擎结果。';
}
