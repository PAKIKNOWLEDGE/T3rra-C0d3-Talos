import type { ServiceSnapshot } from '../core/types.js';

export const SPLASH_DURATION_MS = 2200;
export const SPLASH_EXIT_MS = 450;

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Record-layer content that must not be covered by the task invite surface. */
export function hasRecordBody(snapshot: ServiceSnapshot): boolean {
  if (snapshot.session.historyLoadError) return true;
  if (snapshot.session.historyLoading) return true;
  if (snapshot.session.status === 'loading') return true;
  if (snapshot.errors.length > 0) return true;
  if (snapshot.approvals.some((approval) => approval.status === 'pending')) return true;
  if (snapshot.interactions?.questionnaire) return true;
  if (snapshot.turn.status === 'running' || snapshot.turn.status === 'stopping') return true;
  const timeline = snapshot.timeline.length
    ? snapshot.timeline
    : snapshot.messages.map((message) => ({ kind: message.role }));
  if (timeline.length > 0) return true;
  if (snapshot.tools.length > 0) return true;
  return false;
}

export function shouldShowTaskInvite(
  snapshot: ServiceSnapshot | null,
  view: 'record' | 'events',
): boolean {
  if (view !== 'record') return false;
  if (!snapshot) return false;
  if (snapshot.connection.status !== 'connected') return false;
  if (!snapshot.session.sessionId) return false;
  return !hasRecordBody(snapshot);
}

export type SplashEndReason = 'timeout' | 'skip' | 'reduced-motion';

export function createSplashController(options: {
  onEnd: (reason: SplashEndReason) => void;
  durationMs?: number;
}) {
  const durationMs = options.durationMs ?? SPLASH_DURATION_MS;
  let ended = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = (reason: SplashEndReason) => {
    if (ended) return;
    ended = true;
    if (timer !== undefined) clearTimeout(timer);
    options.onEnd(reason);
  };

  if (prefersReducedMotion()) {
    finish('reduced-motion');
    return { finish, ended: () => ended };
  }

  timer = setTimeout(() => finish('timeout'), durationMs);
  return {
    finish,
    ended: () => ended,
  };
}
