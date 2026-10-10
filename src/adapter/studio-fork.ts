import type { ForkOptionsFact } from '../core/types.js';

export function parseForkOptions(raw: unknown): ForkOptionsFact {
  if (!raw || typeof raw !== 'object') {
    return { canFork: false, unavailableReason: '引擎未返回分叉选项。' };
  }
  const options =
    (raw as { options?: unknown }).options && typeof (raw as { options?: unknown }).options === 'object'
      ? (raw as { options: Record<string, unknown> }).options
      : (raw as Record<string, unknown>);
  const canFork = options.canFork === true;
  return {
    canFork,
    ...(typeof options.unavailableReason === 'string'
      ? { unavailableReason: options.unavailableReason }
      : {}),
    ...(typeof options.suggestedTitle === 'string'
      ? { suggestedTitle: options.suggestedTitle }
      : {}),
  };
}
