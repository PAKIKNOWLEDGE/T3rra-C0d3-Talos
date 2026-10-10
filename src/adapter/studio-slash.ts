import { randomUUID } from 'node:crypto';
import type { SessionSlashCommand } from '../core/types.js';
import { formatModelWireValue } from './session-control.js';

export type StudioRpc = {
  request(method: string, params: Record<string, unknown>): Promise<unknown>;
};

type TuiModel = {
  providerId?: string;
  modelId?: string;
  displayName?: string;
  selected?: boolean;
  supportedVariants?: string[];
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function modelConfigValue(selection: {
  providerId: string;
  modelId: string;
  variant?: string;
}): string {
  const prefix = [
    'm',
    encodeURIComponent(selection.providerId),
    encodeURIComponent(selection.modelId),
  ];
  return selection.variant === undefined
    ? [...prefix, 'u'].join(':')
    : [...prefix, 'v', encodeURIComponent(selection.variant)].join(':');
}

function resolveModelSelection(models: readonly TuiModel[], input: string) {
  const hashIndex = input.indexOf('#');
  const modelRef = hashIndex === -1 ? input : input.slice(0, hashIndex);
  const variant = hashIndex === -1 ? undefined : input.slice(hashIndex + 1);
  const slashIndex = modelRef.indexOf('/');
  if (slashIndex <= 0 || slashIndex === modelRef.length - 1 || (hashIndex !== -1 && !variant)) {
    throw new Error('使用 `/model <provider/model[#variant]>` 选择模型。');
  }
  const providerId = modelRef.slice(0, slashIndex);
  const modelId = modelRef.slice(slashIndex + 1);
  const model = models.find((c) => c.providerId === providerId && c.modelId === modelId);
  if (!model) throw new Error(`未知模型 ${providerId}/${modelId}。`);
  if (variant && model.supportedVariants && !model.supportedVariants.includes(variant)) {
    throw new Error(`模型 ${providerId}/${modelId} 不支持变体 ${variant}。`);
  }
  return { providerId, modelId, ...(variant ? { variant } : {}) };
}

function formatHelp(commands: readonly SessionSlashCommand[]): string {
  return [
    '可用命令：',
    ...commands.map((command) => {
      const hint = command.inputHint ? ` ${command.inputHint}` : '';
      return `- /${command.name}${hint} — ${command.description ?? ''}`;
    }),
  ].join('\n');
}

function formatStatus(account: Record<string, unknown>, models: readonly TuiModel[]): string {
  const selected = models.find((m) => m.selected);
  const selectedModel = selected
    ? `${selected.providerId}/${selected.modelId}${selected.displayName ? ` (${selected.displayName})` : ''}`
    : String(account.defaultModel ?? '未选择');
  const warnings = Array.isArray(account.warnings) ? (account.warnings as string[]) : [];
  return [
    `账号状态：${String(account.status ?? 'unknown')}`,
    `模型：${selectedModel}`,
    `模型来源：${String(account.modelSource ?? 'unknown')}`,
    `认证：${String(account.authMode ?? 'unknown')}`,
    ...(warnings.length ? ['警告：', ...warnings.map((w) => `- ${w}`)] : ['警告：无']),
  ].join('\n');
}

function formatModels(models: readonly TuiModel[]): string {
  if (!models.length) return '当前会话没有可用模型。';
  return [
    '可用模型：',
    ...models.map((model) => {
      const label = model.displayName ? ` (${model.displayName})` : '';
      const selected = model.selected ? ' [当前]' : '';
      return `- ${model.providerId}/${model.modelId}${label}${selected}`;
    }),
    '',
    '使用 `/model <provider/model[#variant]>` 切换。',
  ].join('\n');
}

function formatUsage(usage: Record<string, unknown>): string {
  const summary = usage.summary as Record<string, number | undefined> | undefined;
  if (!summary) return '本会话尚无用量记录。';
  const cost = summary.costUsd;
  return [
    '会话用量：',
    `输入 tokens：${formatInteger(summary.inputTokens ?? 0)}`,
    `输出 tokens：${formatInteger(summary.outputTokens ?? 0)}`,
    `合计 tokens：${formatInteger(summary.totalTokens ?? 0)}`,
    `回合：${formatInteger(summary.turns ?? 0)}`,
    `费用：${cost === undefined ? '未知' : `$${Number(cost).toFixed(4)}`}`,
  ].join('\n');
}

function formatContext(snapshot: Record<string, unknown>): string {
  const status = String(snapshot.status ?? 'unknown');
  if (status === 'loading') return '上下文仍在加载，请稍后再试 /context。';
  const usage = snapshot.contextUsage as { usedTokens?: number; components?: Array<{ kind: string; tokens: number }> } | undefined;
  const model = snapshot.model as { provider?: string; id?: string } | undefined;
  const window = (usage as { contextWindowTokens?: number })?.contextWindowTokens;
  const modelLine = model?.provider && model?.id ? `${model.provider}/${model.id}` : '未选择';
  const used = usage?.usedTokens ?? 0;
  const util =
    window && window > 0 ? `${Math.round((used / window) * 100)}%` : '未知';
  const lines = [
    `上下文：${status}`,
    `模型：${modelLine}`,
    `预算：${formatInteger(used)} / ${window ? formatInteger(window) : '未知'} tokens（${util}）`,
  ];
  if (usage?.components?.length) {
    lines.push('组成：');
    for (const c of usage.components) {
      lines.push(`- ${c.kind}: ${formatInteger(c.tokens)} tokens`);
    }
  }
  return lines.join('\n');
}

function formatDiagnostics(diagnostics: Record<string, unknown>): string {
  const warnings = Array.isArray(diagnostics.warnings) ? (diagnostics.warnings as string[]) : [];
  const presence = (v: unknown) => (v === undefined ? '未知' : v ? '有' : '无');
  return [
    `配置状态：${String(diagnostics.status ?? 'unknown')}`,
    `配置路径：${String(diagnostics.configPath ?? '不可用')}`,
    `默认模型：${String(diagnostics.defaultModel ?? '未配置')}`,
    `Provider：${String(diagnostics.providerId ?? 'unknown')}`,
    `认证：${String(diagnostics.authMode ?? 'unknown')}`,
    ...(warnings.length ? ['警告：', ...warnings.map((w) => `- ${w}`)] : ['警告：无']),
    `配置文件：${presence(diagnostics.configPresent)}`,
  ].join('\n');
}

function formatSkills(payload: Record<string, unknown>): string {
  const skills = Array.isArray(payload.skills) ? payload.skills : [];
  if (!skills.length) return '没有匹配的技能。';
  return [
    `技能 · ${skills.length}`,
    ...skills.map((s) => {
      const skill = s as { displayName?: string; name?: string; description?: string; displayDescription?: string };
      const name = skill.displayName ?? skill.name ?? 'skill';
      const desc = skill.displayDescription ?? skill.description;
      return `- ${name}${desc ? ` — ${desc}` : ''}`;
    }),
  ].join('\n');
}

function formatMcp(payload: Record<string, unknown>): string {
  const servers = Array.isArray(payload.servers) ? payload.servers : [];
  if (!servers.length) return '没有匹配的 MCP 服务器。';
  return [
    `MCP 服务器 · ${servers.length}`,
    ...servers.map((s) => {
      const server = s as { name?: string; enabled?: boolean; transport?: string; description?: string };
      return `- ${server.name ?? 'server'} — ${server.enabled ? '启用' : '禁用'} · ${server.transport ?? 'unknown'}${server.description ? ` — ${server.description}` : ''}`;
    }),
  ].join('\n');
}

function formatCompaction(result: Record<string, unknown>): string {
  if (result.success === true) {
    const before = result.messagesBefore;
    const after = result.messagesAfter;
    if (typeof before === 'number' && typeof after === 'number') {
      return `压缩完成。消息数：${formatInteger(before)} → ${formatInteger(after)}`;
    }
    return '压缩完成。';
  }
  const code = String(result.code ?? result.error ?? 'failed');
  if (code === 'NOTHING_TO_COMPACT' || code === 'unchanged') {
    return '当前会话尚不需要压缩。';
  }
  throw new Error(result.error ? String(result.error) : `压缩失败：${code}`);
}

export async function executeStudioSlashCommand(options: {
  rpc: StudioRpc;
  sessionId: string;
  name: string;
  input: string;
  advertised: readonly SessionSlashCommand[];
}): Promise<string> {
  const { rpc, sessionId, name, input, advertised } = options;
  switch (name) {
    case 'help':
      return formatHelp(advertised);
    case 'status': {
      const [accountRes, modelsRes] = await Promise.all([
        rpc.request('account/status', { sessionId }),
        rpc.request('models/list', { sessionId }),
      ]);
      const account = (accountRes as { status?: unknown }).status as Record<string, unknown>;
      const models = (modelsRes as { models?: TuiModel[] }).models ?? [];
      return formatStatus(account ?? {}, models);
    }
    case 'doctor': {
      const res = (await rpc.request('inspection/diagnostics', { sessionId })) as {
        diagnostics?: Record<string, unknown>;
      };
      return formatDiagnostics(res.diagnostics ?? {});
    }
    case 'context': {
      const res = (await rpc.request('inspection/context', { sessionId })) as {
        snapshot?: Record<string, unknown>;
      };
      return formatContext(res.snapshot ?? {});
    }
    case 'usage': {
      const res = (await rpc.request('inspection/usage', { sessionId })) as { usage?: Record<string, unknown> };
      return formatUsage(res.usage ?? {});
    }
    case 'compact': {
      const res = (await rpc.request('inspection/compact', {
        sessionId,
        ...(input ? { instructions: input } : {}),
      })) as { result?: Record<string, unknown> };
      return formatCompaction(res.result ?? {});
    }
    case 'skills': {
      const res = (await rpc.request('inspection/skills', {
        sessionId,
        ...(input ? { keyword: input } : {}),
      })) as Record<string, unknown>;
      return formatSkills(res);
    }
    case 'mcp': {
      const res = (await rpc.request('inspection/mcp', {
        sessionId,
        ...(input ? { keyword: input } : {}),
      })) as Record<string, unknown>;
      return formatMcp(res);
    }
    case 'model': {
      const modelsRes = (await rpc.request('models/list', { sessionId })) as { models?: TuiModel[] };
      const models = modelsRes.models ?? [];
      if (!input) return formatModels(models);
      const selection = resolveModelSelection(models, input);
      const wire = modelConfigValue(selection);
      await rpc.request('config/set', { sessionId, configId: 'model', value: wire });
      const label = formatModelWireValue(wire);
      return `已选择模型：${label || `${selection.providerId}/${selection.modelId}`}`;
    }
    default:
      throw new Error(`未实现的宿主命令 /${name}`);
  }
}

export function slashCommandLine(name: string, input: string): string {
  return input ? `/${name} ${input}` : `/${name}`;
}

export function newSlashResultIds(): { messageId: string; replyId: string } {
  const base = randomUUID();
  return { messageId: `slash-user-${base}`, replyId: `slash-reply-${base}` };
}
