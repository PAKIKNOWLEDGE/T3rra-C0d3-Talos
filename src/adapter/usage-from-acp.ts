import type { SessionContext } from '../core/types.js';

export function formatTokenCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(value));
}

export function mapUsageUpdateToContext(
  used: number,
  size: number,
  cost?: { amount: number; currency: string } | null,
): Pick<SessionContext, 'usageLabel' | 'usageCapLabel' | 'usageUsed' | 'usageSize'> {
  const usageUsed = Number.isFinite(used) ? used : 0;
  const usageSize = Number.isFinite(size) && size > 0 ? size : 0;
  const pct = usageSize > 0 ? Math.min(100, Math.max(0, (usageUsed / usageSize) * 100)) : 0;
  const usageLabel = formatTokenCount(usageUsed);
  const cap = usageSize > 0 ? `/ ${formatTokenCount(usageSize)}` : '';
  const costNote =
    cost && Number.isFinite(cost.amount) && cost.currency
      ? ` · ${cost.amount.toFixed(4)} ${cost.currency}`
      : '';
  const usageCapLabel = usageSize > 0 ? `${Math.round(pct)}%${cap}${costNote}` : undefined;
  return { usageLabel, usageCapLabel, usageUsed, usageSize };
}

export function usageBarPercent(context: Pick<SessionContext, 'usageUsed' | 'usageSize'>): number {
  const { usageUsed, usageSize } = context;
  if (usageUsed == null || usageSize == null || usageSize <= 0) return 0;
  return Math.min(100, Math.max(0, (usageUsed / usageSize) * 100));
}
