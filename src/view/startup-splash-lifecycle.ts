import {
  SPLASH_DURATION_MS,
  SPLASH_EXIT_MS,
  createSplashController,
  prefersReducedMotion,
} from './startup-surface.js';

export { SPLASH_EXIT_MS } from './startup-surface.js';

export const STARTUP_SPLASH_END_EVENT = 'talos-splash-ended';
export const SPLASH_FAILSAFE_MS = SPLASH_DURATION_MS + SPLASH_EXIT_MS + 750;

export function isSplashDismissKey(key: string): boolean {
  return key === 'Escape' || key === 'Enter' || key === ' ';
}

export function shouldRestoreFocusAfterSplash(
  activeElement: Element | null | undefined,
  splashRoot: Element | null,
  skipButton: Element | null,
  documentBody: Element | null = typeof document !== 'undefined' ? document.body : null,
): boolean {
  if (!activeElement || (documentBody && activeElement === documentBody)) return true;
  if (splashRoot?.contains(activeElement)) return true;
  if (skipButton && activeElement === skipButton) return true;
  return false;
}

export type StartupSplashHandle = {
  dismiss: (reason: string) => void;
  isActive: () => boolean;
};

export function armSplashFailsafe(
  dismiss: (reason: string) => void,
  schedule: (fn: () => void, delayMs: number) => void = (fn, delayMs) => {
    setTimeout(fn, delayMs);
  },
): void {
  schedule(() => dismiss('failsafe'), SPLASH_FAILSAFE_MS);
}

/**
 * Installs splash skip, play timer, and failsafe before business modules run.
 * Returns null when splash markup is absent (page stays interactive).
 */
export function mountStartupSplash(): StartupSplashHandle | null {
  const root = document.documentElement;
  const splash = document.getElementById('startupSplash');
  const skip = document.getElementById('skipStartupSplash');
  const chrome = [
    document.querySelector('.masthead'),
    document.querySelector('.workspace'),
    document.querySelector('.sample-bar'),
  ].filter((node): node is HTMLElement => node instanceof HTMLElement);

  if (!splash) {
    root.dataset.phase = 'ready';
    return null;
  }

  let ended = false;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const removeListeners: Array<() => void> = [];

  const clearChromeInert = () => {
    for (const element of chrome) {
      element.inert = false;
    }
  };

  const dismiss = (reason: string) => {
    if (ended) return;
    ended = true;
    for (const remove of removeListeners) remove();
    removeListeners.length = 0;
    while (timers.length) {
      clearTimeout(timers.pop());
    }
    if (exitTimer !== undefined) {
      clearTimeout(exitTimer);
      exitTimer = undefined;
    }

    clearChromeInert();
    root.dataset.phase = 'ready';

    exitTimer = setTimeout(() => {
      splash.hidden = true;
      splash.setAttribute('aria-hidden', 'true');
      document.dispatchEvent(
        new CustomEvent(STARTUP_SPLASH_END_EVENT, { detail: { reason } }),
      );
    }, SPLASH_EXIT_MS);
  };

  const schedule = (fn: () => void, delayMs: number) => {
    const id = setTimeout(fn, delayMs);
    timers.push(id);
  };

  armSplashFailsafe((reason) => dismiss(reason), schedule);

  const onCaptureKey = (event: KeyboardEvent) => {
    if (root.dataset.phase !== 'splash') return;
    if (!isSplashDismissKey(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    dismiss('skip');
  };
  document.addEventListener('keydown', onCaptureKey, true);
  removeListeners.push(() => document.removeEventListener('keydown', onCaptureKey, true));

  const onSkipClick = (event: Event) => {
    event.stopPropagation();
    dismiss('skip');
  };
  skip?.addEventListener('click', onSkipClick);
  removeListeners.push(() => skip?.removeEventListener('click', onSkipClick));

  const onSplashClick = (event: Event) => {
    if ((event.target as Element | null)?.closest('.splash-skip')) return;
    dismiss('skip');
  };
  splash.addEventListener('click', onSplashClick);
  removeListeners.push(() => splash.removeEventListener('click', onSplashClick));

  if (prefersReducedMotion()) {
    dismiss('reduced-motion');
    return { dismiss, isActive: () => false };
  }

  splash.hidden = false;
  splash.removeAttribute('aria-hidden');
  for (const element of chrome) {
    element.inert = true;
  }
  root.dataset.phase = 'splash';
  skip?.focus();

  createSplashController({
    durationMs: SPLASH_DURATION_MS,
    onEnd: (reason) => dismiss(reason),
  });

  return {
    dismiss,
    isActive: () => root.dataset.phase === 'splash',
  };
}
