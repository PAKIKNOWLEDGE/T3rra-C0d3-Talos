import type {
  PlanReviewFact,
  QuestionnaireFact,
  QuestionnaireReplyAnswer,
  QuestionnaireStepFact,
  SessionInteractions,
} from '../core/types.js';

/** Matches Talos-CLI `MINIMAX_CODE_DEFAULT_AGENT_NAME` when session has no `agentName`. */
export const DEFAULT_STUDIO_AGENT_NAME = 'mavis';

type RawQuestionnaire = {
  id?: string;
  title?: string;
  mode?: string;
  steps?: unknown[];
  modePayload?: { planReview?: { markdown?: string; path?: string } };
  requester?: { agentName?: string };
};

export function readSessionAgentName(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const session = (result as { session?: { agentName?: string } }).session;
  const name = session?.agentName;
  return typeof name === 'string' && name.trim() ? name.trim() : undefined;
}

function parseStep(raw: unknown): QuestionnaireStepFact | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const question = typeof row.question === 'string' ? row.question : '';
  if (!id || !question) return undefined;
  const options = Array.isArray(row.options)
    ? row.options
        .map((item) => {
          if (!item || typeof item !== 'object') return undefined;
          const opt = item as { id?: string; label?: string };
          if (!opt.id || !opt.label) return undefined;
          return { id: opt.id, label: opt.label };
        })
        .filter((item): item is { id: string; label: string } => Boolean(item))
    : [];
  return {
    id,
    question,
    ...(typeof row.description === 'string' ? { description: row.description } : {}),
    options,
    allowOther: row.allowOther === true,
  };
}

export function parseQuestionnaireRequest(raw: unknown): QuestionnaireFact | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const request = raw as RawQuestionnaire;
  const requestId = typeof request.id === 'string' ? request.id : '';
  if (!requestId) return undefined;
  const steps = (Array.isArray(request.steps) ? request.steps : [])
    .map(parseStep)
    .filter((item): item is QuestionnaireStepFact => Boolean(item));
  if (!steps.length) return undefined;
  const isPlanMode = request.mode === 'plan' || Boolean(request.modePayload?.planReview?.markdown);
  return {
    requestId,
    ...(typeof request.title === 'string' ? { title: request.title } : {}),
    steps,
    isPlanMode,
  };
}

export function planReviewFromRequest(raw: unknown): PlanReviewFact | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const request = raw as RawQuestionnaire;
  const requestId = typeof request.id === 'string' ? request.id : '';
  const markdown = request.modePayload?.planReview?.markdown;
  if (!requestId || typeof markdown !== 'string' || !markdown.trim()) return undefined;
  const path = request.modePayload?.planReview?.path;
  return {
    requestId,
    ...(typeof request.title === 'string' ? { title: request.title } : {}),
    markdown,
    ...(typeof path === 'string' ? { path } : {}),
  };
}

export function planLinesFromMarkdown(markdown: string, limit = 12): string[] {
  const lines = markdown
    .split('\n')
    .map((line) => line.replace(/^[\s\-*•\d.)]+/, '').trim())
    .filter(Boolean);
  return lines.slice(0, limit);
}

export function buildInteractionsFromStudio(
  agentName: string,
  pendingRaw: unknown,
  planReviewRaw: unknown,
): SessionInteractions {
  const interactions: SessionInteractions = { agentName };
  const pendingRequest =
    pendingRaw && typeof pendingRaw === 'object'
      ? (pendingRaw as { request?: unknown }).request
      : undefined;
  const questionnaire = parseQuestionnaireRequest(pendingRequest);
  if (questionnaire) interactions.questionnaire = questionnaire;

  let planReview = planReviewFromRequest(pendingRequest);
  const latestRequest =
    planReviewRaw && typeof planReviewRaw === 'object'
      ? (planReviewRaw as { request?: unknown }).request
      : undefined;
  if (!planReview) planReview = planReviewFromRequest(latestRequest);
  if (planReview) interactions.planReview = planReview;
  return interactions;
}

export function singleOptionReply(stepId: string, optionId: string): QuestionnaireReplyAnswer[] {
  return [{ stepId, selectedOptionIds: [optionId] }];
}
