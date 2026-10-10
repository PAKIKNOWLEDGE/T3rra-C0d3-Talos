import type { SessionContext } from '../core/types.js';
import { mapUsageUpdateToContext } from './usage-from-acp.js';

type UsagePayload = {
  summary?: {
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
  };
};

type ContextSnapshot = {
  contextUsage?: {
    contextWindowTokens?: number;
    usedTokens?: number;
  };
  model?: {
    contextWindow?: number;
  };
};

type ContextPayload = {
  snapshot?: ContextSnapshot;
};

export function mergeUsageSummaryPayload(usage: UsagePayload, summaryRaw: unknown): UsagePayload {
  if (!summaryRaw || typeof summaryRaw !== 'object') return usage;
  const summary = summaryRaw as Record<string, number | undefined>;
  const inputTokens = summary.inputTokens ?? usage.summary?.inputTokens ?? 0;
  const outputTokens = summary.outputTokens ?? usage.summary?.outputTokens ?? 0;
  const cacheRead = summary.cacheReadTokens ?? 0;
  const cacheWrite = summary.cacheWriteTokens ?? 0;
  const hasDetail =
    summary.inputTokens != null ||
    summary.outputTokens != null ||
    summary.cacheReadTokens != null ||
    summary.cacheWriteTokens != null;
  const totalTokens = hasDetail
    ? inputTokens + outputTokens + cacheRead + cacheWrite
    : (summary.totalTokens ?? usage.summary?.totalTokens ?? inputTokens + outputTokens + cacheRead + cacheWrite);
  return {
    ...usage,
    summary: {
      ...usage.summary,
      inputTokens,
      outputTokens,
      totalTokens,
      ...(summary.costUsd != null ? { costUsd: summary.costUsd } : {}),
    },
  };
}

export function mapStudioUsageToContext(usage: UsagePayload, context?: ContextPayload): SessionContext {
  const snap = context?.snapshot;
  const usedFromContext = snap?.contextUsage?.usedTokens;
  const usedFromSummary =
    usage.summary?.totalTokens ??
    ((usage.summary?.inputTokens ?? 0) + (usage.summary?.outputTokens ?? 0) || undefined);
  const used = usedFromContext ?? usedFromSummary ?? 0;
  const size =
    snap?.contextUsage?.contextWindowTokens ??
    snap?.model?.contextWindow ??
    0;
  const cost =
    usage.summary?.costUsd != null
      ? { amount: usage.summary.costUsd, currency: 'USD' }
      : undefined;
  return mapUsageUpdateToContext(used, size, cost);
}
