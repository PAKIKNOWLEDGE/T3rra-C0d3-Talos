import { describe, expect, it } from 'vitest';
import { formatAccountStatus } from '../src/adapter/studio-account.js';

describe('formatAccountStatus', () => {
  it('reads nested status payload', () => {
    const view = formatAccountStatus({
      status: { status: 'authenticated', authMode: 'oauth', modelSource: 'cloud' },
    });
    expect(view?.label).toContain('账号 authenticated');
    expect(view?.label).toContain('认证 oauth');
  });

  it('accepts flat status object', () => {
    const view = formatAccountStatus({ status: 'guest', authMode: 'none' });
    expect(view?.label).toContain('账号 guest');
  });
});
