import { describe, expect, it } from 'vitest';
import { StudioJsonRpcClient } from '../src/adapter/studio-jsonrpc.js';
import {
  TurnStreamProjector,
  engineEventsFromTurnStream,
  mapTurnCompletedStatus,
} from '../src/adapter/studio-stream.js';
import { TalosStudioAdapter } from '../src/adapter/talos-studio.js';
import { mapStudioUsageToContext } from '../src/adapter/usage-from-studio.js';

describe('studio json-rpc client', () => {
  it('parses responses and notifications', async () => {
    const lines: string[] = [];
    const notifications: Array<{ method: string; params: unknown }> = [];
    const client = new StudioJsonRpcClient(
      (line) => lines.push(line),
      (method, params) => notifications.push({ method, params }),
    );
    const responsePromise = client.request('studio/initialize', { cwd: 'C:\\tmp' });
    expect(lines).toHaveLength(1);
    const sent = JSON.parse(lines[0]!.trim()) as { method: string; id: number };
    client.feed(`${JSON.stringify({ jsonrpc: '2.0', id: sent.id, result: { protocolVersion: 2 } })}\n`);
    const response = await responsePromise;
    expect(response).toEqual({ protocolVersion: 2 });
    client.feed(`${JSON.stringify({ method: 'turn/event', params: { sessionId: 's1', event: { type: 'heartbeat' } } })}\n`);
    expect(notifications).toHaveLength(1);
  });
});

describe('studio stream mapping', () => {
  it('maps assistant delta chunks', () => {
    const events = engineEventsFromTurnStream(1, 's1', {
      type: 'delta',
      messageId: 'm1',
      content: 'hello',
    });
    expect(events[0]).toMatchObject({ kind: 'assistant.delta', text: 'hello' });
  });

  it('replaces assistant text from a final message frame after deltas', () => {
    const turnId = 'turn-1';
    const projector = new TurnStreamProjector();
    const deltaEvents = projector.project(1, 's1', {
      type: 'delta',
      turnId,
      messageId: 'm1',
      content: 'hello',
    });
    const messageEvents = projector.project(1, 's1', {
      type: 'message',
      turnId,
      message: { id: 'm1', role: 'assistant', content: 'hello!', thinking: 'reason' },
    });
    expect(deltaEvents.some((event) => event.kind === 'assistant.delta')).toBe(true);
    expect(messageEvents.some((event) => event.kind === 'assistant.replace')).toBe(true);
    expect(messageEvents.find((event) => event.kind === 'assistant.replace')).toMatchObject({
      text: 'hello!',
    });
  });

  it('emits assistant text from a message-only frame when no deltas streamed', () => {
    const events = engineEventsFromTurnStream(1, 's1', {
      type: 'message',
      message: { id: 'solo', role: 'assistant', content: 'only frame' },
    });
    expect(events).toEqual([
      {
        kind: 'assistant.replace',
        processEpoch: 1,
        sessionId: 's1',
        messageId: 'solo',
        text: 'only frame',
      },
    ]);
  });

  it('routes thinking-only deltas to thought.delta', () => {
    const events = engineEventsFromTurnStream(1, 's1', {
      type: 'delta',
      messageId: 'm1',
      thinking: 'secret reasoning',
    });
    expect(events).toEqual([
      {
        kind: 'thought.delta',
        processEpoch: 1,
        sessionId: 's1',
        thoughtId: 'thought-m1',
        text: 'secret reasoning',
      },
    ]);
  });

  it('maps generic runtime events to stream.notice', () => {
    const events = engineEventsFromTurnStream(1, 's1', {
      type: 'generic',
      eventType: 'plan.updated',
      data: { message: 'step 1 done' },
    });
    expect(events[0]).toMatchObject({ kind: 'stream.notice', text: expect.stringContaining('plan.updated') });
  });

  it('maps turn completed status', () => {
    expect(mapTurnCompletedStatus('succeeded')).toBe('end_turn');
    expect(mapTurnCompletedStatus('cancelled')).toBe('cancelled');
  });
});

describe('studio adapter notifications', () => {
  it('emits session context from turn events', () => {
    const lines: string[] = [];
    const events: Array<{ kind: string }> = [];
    const rpc = new StudioJsonRpcClient(
      (line) => lines.push(line),
      () => {},
    );
    const adapter = TalosStudioAdapter.attach(rpc, 1, (event) => events.push(event));
    adapter.handleNotification('turn/event', {
      sessionId: 's1',
      event: { type: 'delta', messageId: 'm1', content: 'hi' },
    });
    expect(events.some((event) => event.kind === 'assistant.delta')).toBe(true);
    adapter.close();
  });
});

describe('studio usage mapping', () => {
  it('maps inspection usage totals', () => {
    const context = mapStudioUsageToContext(
      { summary: { totalTokens: 1200, costUsd: 0.01 } },
      {
        snapshot: {
          contextUsage: { usedTokens: 1200, contextWindowTokens: 100_000 },
          model: { contextWindow: 200_000 },
        },
      },
    );
    expect(context.usageUsed).toBe(1200);
    expect(context.usageSize).toBe(100_000);
  });
});
