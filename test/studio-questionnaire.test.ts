import { describe, expect, it, vi } from 'vitest';
import { FactStore } from '../src/core/fact-store.js';
import { TalosStudioAdapter } from '../src/adapter/talos-studio.js';
import { StudioJsonRpcClient } from '../src/adapter/studio-jsonrpc.js';
import {
  buildInteractionsFromStudio,
  parseQuestionnaireRequest,
  planLinesFromMarkdown,
  planReviewFromRequest,
} from '../src/adapter/studio-questionnaire.js';

describe('studio questionnaire parsing', () => {
  it('parses pending questionnaire steps', () => {
    const fact = parseQuestionnaireRequest({
      id: 'q1',
      title: 'Pick one',
      steps: [{ id: 's1', question: 'Go?', options: [{ id: 'a', label: 'Yes' }], allowOther: false }],
    });
    expect(fact?.requestId).toBe('q1');
    expect(fact?.steps[0].options[0].label).toBe('Yes');
  });

  it('extracts plan review markdown', () => {
    const plan = planReviewFromRequest({
      id: 'p1',
      modePayload: { planReview: { markdown: '- step one\n- step two', path: 'plan.md' } },
    });
    expect(plan?.markdown).toContain('step one');
    expect(planLinesFromMarkdown(plan!.markdown)).toEqual(['step one', 'step two']);
  });

  it('keeps pending questionnaire while still loading latest plan body', () => {
    const interactions = buildInteractionsFromStudio(
      'mavis',
      { request: { id: 'q1', steps: [{ id: 's1', question: 'Q', allowOther: false }] } },
      { request: { id: 'p9', modePayload: { planReview: { markdown: 'old' } } } },
    );
    expect(interactions.questionnaire?.requestId).toBe('q1');
    expect(interactions.planReview?.markdown).toBe('old');
  });
});

describe('adapter refreshInteractions', () => {
  it('emits interaction.updated after session load', async () => {
    const events: unknown[] = [];
    const store = new FactStore('q');
    let adapter!: TalosStudioAdapter;
    const rpc = new StudioJsonRpcClient(
      () => {},
      (method, params) => adapter.handleNotification(method, params),
    );
    adapter = TalosStudioAdapter.attach(rpc, 1, (event) => {
      events.push(event);
      store.apply(event);
    });
    const request = vi.spyOn(rpc, 'request');
    request.mockImplementation(async (method) => {
      if (method === 'session/load') return { session: { sessionId: 's1', agentName: 'mavis' } };
      if (method === 'commands/list') return { commands: [] };
      if (method === 'session/messages') return { messages: [], hasMore: false };
      if (method === 'inspection/usage') return { usage: {} };
      if (method === 'inspection/context') return { snapshot: {} };
      if (method === 'session/activeRun') return { activeRun: null };
      if (method === 'questionnaire/getPending') return { request: undefined };
      if (method === 'queue/list') return { items: [] };
      if (method === 'inspection/skills') return { skills: [] };
      if (method === 'inspection/mcp') return { servers: [] };
      if (method === 'inspection/diagnostics') return { diagnostics: {} };
      if (method === 'session/inputSummaries') return { summaries: [] };
      if (method === 'workspace/git') return { metadata: {} };
      if (method === 'inspection/instructionSources') return { sources: [] };
      if (method === 'inspection/projectMcp') return { preview: { servers: [] } };
      if (method === 'inspection/context') return { snapshot: {} };
      if (method === 'backgroundTasks/list') return { tasks: [] };
      if (method === 'plugins/listInstalled') return { plugins: [] };
      if (method === 'goal/get') throw new Error('Goal feature is disabled.');
      if (method === 'delegation/get') return { snapshot: {} };
      if (method === 'questionnaire/getPlanReview') {
        return {
          request: {
            id: 'plan-1',
            steps: [{ id: 's1', question: 'Approve?', options: [{ id: 'ok', label: 'OK' }], allowOther: false }],
            mode: 'plan',
            modePayload: { planReview: { markdown: '## Plan\n- Do work' } },
          },
        };
      }
      return {};
    });
    await adapter.loadSession('s1', 'C:\\tmp');
    expect(events.some((event) => (event as { kind?: string }).kind === 'interaction.updated')).toBe(true);
    expect(store.snapshot().interactions.planReview?.markdown).toContain('Do work');
    adapter.close();
  });
});
