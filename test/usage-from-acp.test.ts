import { describe, expect, it } from 'vitest';
import { mapUsageUpdateToContext, usageBarPercent } from '../src/adapter/usage-from-acp.js';
import { MinimaxAcpAdapter, prepareTalosAcpClient } from '../src/adapter/minimax-acp.js';
import { FactStore } from '../src/core/fact-store.js';

describe('mapUsageUpdateToContext', () => {
  it('maps used/size to labels and bar percent inputs', () => {
    const ctx = mapUsageUpdateToContext(12_400, 128_000);
    expect(ctx.usageLabel).toBe('12.4k');
    expect(ctx.usageUsed).toBe(12_400);
    expect(ctx.usageSize).toBe(128_000);
    expect(ctx.usageCapLabel).toMatch(/^10%/);
    expect(usageBarPercent(ctx)).toBeCloseTo(9.6875, 3);
  });
});

describe('usage_update notification', () => {
  it('merges into session context via adapter', () => {
    const { holder } = prepareTalosAcpClient();
    const store = new FactStore('s');
    const connection = {
      agent: { request: async () => ({}), notify: async () => {} },
      close: () => {},
    };
    MinimaxAcpAdapter.attach(holder, connection as never, 1, (event) => {
      store.apply(event);
    });
    holder.adapter?.receiveSessionNotification({
      sessionId: 's1',
      update: { sessionUpdate: 'usage_update', used: 500, size: 2000 },
    });
    expect(store.snapshot().context).toMatchObject({
      usageLabel: '500',
      usageUsed: 500,
      usageSize: 2000,
    });
  });
});
