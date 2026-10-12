import { describe, expect, it, vi } from 'vitest';
import { FactStore } from '../src/core/fact-store.js';
import type { ServiceSnapshot } from '../src/core/types.js';
import {
  createSplashController,
  hasRecordBody,
  shouldShowTaskInvite,
} from '../src/view/startup-surface.js';

function baseSnapshot(overrides: Partial<ServiceSnapshot> = {}): ServiceSnapshot {
  return {
    serviceEpoch: 'test',
    revision: 1,
    connection: { status: 'connected', processEpoch: 1 },
    session: { status: 'ready', sessionId: 's1', cwd: 'C:/w' },
    turn: { status: 'idle' },
    context: {},
    sessions: [],
    agent: { sessionDelete: false },
    messages: [],
    timeline: [],
    tools: [],
    approvals: [],
    interactions: {},
    queue: [],
    inspection: { skillNames: [], mcpServerNames: [] },
    inputSummaries: [],
    errors: [],
    ...overrides,
  };
}

describe('startup-surface (v1)', () => {
  it('shouldShowTaskInvite only for connected empty sessions on record view', () => {
    expect(shouldShowTaskInvite(baseSnapshot(), 'record')).toBe(true);
    expect(shouldShowTaskInvite(baseSnapshot(), 'events')).toBe(false);
    expect(shouldShowTaskInvite(null, 'record')).toBe(false);
    expect(
      shouldShowTaskInvite(
        baseSnapshot({ connection: { status: 'disconnected', processEpoch: 1 } }),
        'record',
      ),
    ).toBe(false);
    expect(
      shouldShowTaskInvite(baseSnapshot({ session: { status: 'ready' } }), 'record'),
    ).toBe(false);
  });

  it('hasRecordBody blocks invite for loading, errors, running, approvals, and content', () => {
    expect(hasRecordBody(baseSnapshot({ session: { status: 'loading', sessionId: 's1' } }))).toBe(
      true,
    );
    expect(
      hasRecordBody(
        baseSnapshot({ session: { status: 'ready', sessionId: 's1', historyLoading: true } }),
      ),
    ).toBe(true);
    expect(
      hasRecordBody(
        baseSnapshot({
          session: { status: 'ready', sessionId: 's1', historyLoadError: 'fail' },
        }),
      ),
    ).toBe(true);
    expect(hasRecordBody(baseSnapshot({ turn: { status: 'running', turnId: 't1' } }))).toBe(true);
    expect(
      hasRecordBody(
        baseSnapshot({
          approvals: [
            {
              requestId: 'a1',
              toolCallId: 't',
              status: 'pending',
              options: [],
            },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      hasRecordBody(
        baseSnapshot({
          interactions: {
            questionnaire: {
              requestId: 'q1',
              steps: [],
            },
          },
        }),
      ),
    ).toBe(true);
    expect(
      hasRecordBody(
        baseSnapshot({
          timeline: [{ kind: 'user', messageId: 'm1', text: 'hi' }],
        }),
      ),
    ).toBe(true);
    expect(shouldShowTaskInvite(baseSnapshot({ errors: ['x'] }), 'record')).toBe(false);
  });

  it('createSplashController ends once and supports skip', () => {
    const onEnd = vi.fn();
    const controller = createSplashController({ onEnd, durationMs: 5000 });
    controller.finish('skip');
    controller.finish('skip');
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith('skip');
  });

  it('FactStore snapshot exposes historyLoading while history request is pending', () => {
    const store = new FactStore('hist');
    store.apply({ kind: 'connected', processEpoch: 1 });
    store.apply({ kind: 'session.loaded', processEpoch: 1, sessionId: 's1', cwd: 'C:/w' });
    store.apply({
      kind: 'session.history_resync',
      processEpoch: 1,
      sessionId: 's1',
      reason: 'resync-required',
      historyRequestId: 9,
    });
    expect(store.snapshot().session.historyLoading).toBe(true);
    expect(shouldShowTaskInvite(store.snapshot(), 'record')).toBe(false);
    store.apply({
      kind: 'session.history',
      processEpoch: 1,
      sessionId: 's1',
      messages: [],
      timeline: [],
      tools: [],
      historyRequestId: 9,
    });
    expect(store.snapshot().session.historyLoading).toBe(false);
    expect(shouldShowTaskInvite(store.snapshot(), 'record')).toBe(true);
  });
});
