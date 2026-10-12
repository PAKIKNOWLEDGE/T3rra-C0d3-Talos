import { describe, expect, it, vi } from 'vitest';
import {
  SPLASH_FAILSAFE_MS,
  armSplashFailsafe,
  isSplashDismissKey,
  shouldRestoreFocusAfterSplash,
} from '../src/view/startup-splash-lifecycle.js';

describe('startup-splash-lifecycle (S1/S2)', () => {
  it('isSplashDismissKey matches skip keys only', () => {
    expect(isSplashDismissKey('Escape')).toBe(true);
    expect(isSplashDismissKey('Enter')).toBe(true);
    expect(isSplashDismissKey(' ')).toBe(true);
    expect(isSplashDismissKey('a')).toBe(false);
  });

  it('shouldRestoreFocusAfterSplash respects user-chosen focus targets', () => {
    const splash = {
      contains: (element: Element) => element === skip || element === inner,
    };
    const skip = { id: 'skip' } as Element;
    const inner = { id: 'inner' } as Element;
    const prompt = { id: 'prompt' } as Element;
    const body = { id: 'body' } as Element;
    expect(shouldRestoreFocusAfterSplash(body, splash as Element, skip, body)).toBe(true);
    expect(shouldRestoreFocusAfterSplash(skip, splash as Element, skip, body)).toBe(true);
    expect(shouldRestoreFocusAfterSplash(inner, splash as Element, skip, body)).toBe(true);
    expect(shouldRestoreFocusAfterSplash(prompt, splash as Element, skip, body)).toBe(false);
  });

  it('armSplashFailsafe dismisses when business module never runs', () => {
    const dismiss = vi.fn();
    const scheduled: Array<{ fn: () => void; ms: number }> = [];
    armSplashFailsafe(dismiss, (fn, ms) => {
      scheduled.push({ fn, ms });
    });
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].ms).toBe(SPLASH_FAILSAFE_MS);
    scheduled[0].fn();
    expect(dismiss).toHaveBeenCalledWith('failsafe');
  });
});
