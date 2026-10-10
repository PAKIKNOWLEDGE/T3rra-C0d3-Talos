import { describe, expect, it } from 'vitest';
import { mergeUsageSummaryPayload, mapStudioUsageToContext } from '../src/adapter/usage-from-studio.js';

describe('usage-from-studio', () => {
  it('mergeUsageSummaryPayload folds cache tokens into total', () => {
    const merged = mergeUsageSummaryPayload(
      { summary: { inputTokens: 1, outputTokens: 2, totalTokens: 3 } },
      { inputTokens: 10, outputTokens: 5, cacheReadTokens: 80, cacheWriteTokens: 10 },
    );
    const ctx = mapStudioUsageToContext(merged, {});
    expect(ctx.usageUsed).toBe(105);
  });
});
