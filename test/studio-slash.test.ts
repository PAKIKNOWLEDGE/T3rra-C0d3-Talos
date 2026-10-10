import { describe, expect, it, vi } from 'vitest';
import { executeStudioSlashCommand } from '../src/adapter/studio-slash.js';

describe('executeStudioSlashCommand', () => {
  it('lists models without turn/start', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'models/list') {
        return {
          models: [{ providerId: 'p', modelId: 'm', selected: true, displayName: 'Demo' }],
        };
      }
      throw new Error(`unexpected ${method}`);
    });
    const text = await executeStudioSlashCommand({
      rpc: { request },
      sessionId: 's1',
      name: 'model',
      input: '',
      advertised: [{ name: 'model', description: 'Model' }],
    });
    expect(text).toContain('p/m');
    expect(request).not.toHaveBeenCalledWith('turn/start', expect.anything());
  });

  it('compact uses inspection/compact not turn/start', async () => {
    const request = vi.fn(async (method: string) => {
      if (method === 'inspection/compact') {
        return { result: { success: true, messagesBefore: 10, messagesAfter: 4 } };
      }
      throw new Error(`unexpected ${method}`);
    });
    const text = await executeStudioSlashCommand({
      rpc: { request },
      sessionId: 's1',
      name: 'compact',
      input: 'keep decisions',
      advertised: [{ name: 'compact', description: 'Compact' }],
    });
    expect(text).toContain('压缩完成');
    expect(request).toHaveBeenCalledWith(
      'inspection/compact',
      expect.objectContaining({ sessionId: 's1' }),
    );
    expect(request).not.toHaveBeenCalledWith('turn/start', expect.anything());
  });

  it('sets model via config/set', async () => {
    const request = vi.fn(async (method: string, params: Record<string, unknown>) => {
      if (method === 'models/list') {
        return { models: [{ providerId: 'p', modelId: 'm', selected: false }] };
      }
      if (method === 'config/set') {
        expect(params.configId).toBe('model');
        expect(String(params.value)).toMatch(/^m:/);
        return {};
      }
      throw new Error(`unexpected ${method}`);
    });
    const text = await executeStudioSlashCommand({
      rpc: { request },
      sessionId: 's1',
      name: 'model',
      input: 'p/m',
      advertised: [{ name: 'model', description: 'Model' }],
    });
    expect(text).toContain('已选择模型');
    expect(request).toHaveBeenCalledWith('config/set', expect.objectContaining({ sessionId: 's1' }));
  });
});
