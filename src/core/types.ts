export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type SessionStatus = 'none' | 'loading' | 'ready' | 'running' | 'stopping' | 'error';
export type TurnStatus = 'idle' | 'running' | 'stopping' | 'completed' | 'cancelled' | 'failed' | 'unknown';

export type ToolFact = {
  toolCallId: string;
  title?: string;
  kind?: string;
  status?: string;
  rawInput?: unknown;
  rawOutput?: unknown;
  locations?: string[];
};

export type MessageFact = {
  messageId: string;
  role: 'user' | 'assistant';
  text: string;
};

export type TimelineItem =
  | { kind: 'user'; messageId: string; text: string }
  | { kind: 'thought'; thoughtId: string; text: string }
  | { kind: 'assistant'; messageId: string; text: string; segmentIndex?: number }
  | { kind: 'tool'; toolCallId: string }
  | { kind: 'notice'; noticeId: string; text: string };

export type ApprovalFact = {
  requestId: string;
  toolCallId: string;
  options: Array<{ optionId: string; name: string; kind: string }>;
  status: 'pending' | 'settled' | 'cancelled';
};

export type EngineEvent =
  | { kind: 'connected'; processEpoch: number }
  | { kind: 'disconnected'; processEpoch: number; error?: string }
  | { kind: 'agent.capabilities'; processEpoch: number; sessionDelete: boolean }
  | { kind: 'session.deleted'; processEpoch: number; sessionId: string }
  | { kind: 'session.created'; processEpoch: number; sessionId: string; cwd: string }
  | { kind: 'session.loaded'; processEpoch: number; sessionId: string; cwd: string }
  | {
      kind: 'session.history';
      processEpoch: number;
      sessionId: string;
      historyRequestId?: number;
      messages: MessageFact[];
      timeline: TimelineItem[];
      tools: ToolFact[];
    }
  | {
      kind: 'session.history_error';
      processEpoch: number;
      sessionId: string;
      message: string;
      historyRequestId?: number;
    }
  | {
      kind: 'stream.notice';
      processEpoch: number;
      sessionId: string;
      noticeId: string;
      text: string;
      turnId?: string;
    }
  | {
      kind: 'session.listed';
      processEpoch: number;
      cwd: string;
      sessions: SessionIndexItem[];
    }
  | { kind: 'session.list_error'; processEpoch: number; cwd: string; message: string }
  | { kind: 'session.run_state'; processEpoch: number; sessionId: string; running: boolean }
  | { kind: 'session.context'; processEpoch: number; sessionId: string; context: SessionContext }
  | { kind: 'turn.started'; processEpoch: number; sessionId: string; turnId: string; prompt: string }
  | {
      kind: 'user.message';
      processEpoch: number;
      sessionId: string;
      messageId: string;
      text: string;
      turnId?: string;
    }
  | {
      kind: 'slash.completed';
      processEpoch: number;
      sessionId: string;
      messageId: string;
      replyId: string;
      command: string;
      output: string;
    }
  | {
      kind: 'assistant.delta';
      processEpoch: number;
      sessionId: string;
      messageId: string;
      text: string;
      turnId?: string;
    }
  | {
      kind: 'assistant.replace';
      processEpoch: number;
      sessionId: string;
      messageId: string;
      text: string;
      turnId?: string;
    }
  | {
      kind: 'assistant.layout';
      processEpoch: number;
      sessionId: string;
      messageId: string;
      timeline: TimelineItem[];
      tools: ToolFact[];
      combinedText: string;
      turnId?: string;
    }
  | {
      kind: 'session.history_resync';
      processEpoch: number;
      sessionId: string;
      reason: string;
      historyRequestId?: number;
      turnId?: string;
    }
  | {
      kind: 'session.history_replaced';
      processEpoch: number;
      sessionId: string;
      messages: MessageFact[];
      timeline: TimelineItem[];
      tools: ToolFact[];
      turnId?: string;
    }
  | {
      kind: 'thought.delta';
      processEpoch: number;
      sessionId: string;
      thoughtId: string;
      text: string;
      turnId?: string;
    }
  | {
      kind: 'thought.replace';
      processEpoch: number;
      sessionId: string;
      thoughtId: string;
      text: string;
      turnId?: string;
    }
  | {
      kind: 'tool.update';
      processEpoch: number;
      sessionId: string;
      toolCallId: string;
      patch: Omit<ToolFact, 'toolCallId'>;
      turnId?: string;
    }
  | {
      kind: 'approval.requested';
      processEpoch: number;
      sessionId: string;
      approval: ApprovalFact;
    }
  | {
      kind: 'approval.settled';
      processEpoch: number;
      sessionId: string;
      requestId: string;
      status: 'settled' | 'cancelled';
    }
  | {
      kind: 'turn.finished';
      processEpoch: number;
      sessionId: string;
      turnId: string;
      stopReason: 'end_turn' | 'cancelled' | 'max_turn_requests' | 'error';
    }
  | {
      kind: 'interaction.updated';
      processEpoch: number;
      sessionId: string;
      interactions: SessionInteractions;
    }
  | { kind: 'session.queue'; processEpoch: number; sessionId: string; items: QueueItemFact[] }
  | {
      kind: 'session.inspection';
      processEpoch: number;
      sessionId: string;
      inspection: InspectionFact;
      inputSummaries: InputSummaryFact[];
    }
  | {
      kind: 'error';
      processEpoch: number;
      message: string;
      sessionId?: string;
      turnId?: string;
      historyRequestId?: number;
    };

export type SessionModeOption = { id: string; name: string };
export type SessionModelOption = { value: string; name: string };
export type SessionThinkingOption = { value: string; name: string };

export type SessionSlashCommand = {
  name: string;
  description?: string;
  inputHint?: string;
};

export type SessionIndexItem = {
  sessionId: string;
  cwd: string;
  title?: string;
  updatedAt?: string;
  archived?: boolean;
  /** From `session/activeRun` polling or local turn lifecycle. */
  running?: boolean;
};

export type QuestionnaireStepFact = {
  id: string;
  question: string;
  description?: string;
  options: Array<{ id: string; label: string }>;
  allowOther: boolean;
};

export type QuestionnaireFact = {
  requestId: string;
  title?: string;
  steps: QuestionnaireStepFact[];
  isPlanMode: boolean;
};

export type PlanReviewFact = {
  requestId: string;
  title?: string;
  markdown: string;
  path?: string;
};

export type QuestionnaireReplyAnswer = {
  stepId: string;
  selectedOptionIds?: string[];
  selectedOther?: boolean;
  otherText?: string;
  skipped?: boolean;
};

export type SessionInteractions = {
  agentName?: string;
  questionnaire?: QuestionnaireFact;
  planReview?: PlanReviewFact;
};

export type QueueItemFact = {
  itemId: string;
  status: string;
  content?: string;
};

export type InputSummaryFact = {
  userMessageId: string;
  contentHead?: string;
  timestamp?: number;
};

export type BackgroundTaskFact = {
  taskId: string;
  kind: string;
  status: string;
  description?: string;
};

export type GoalStatusFact =
  | { available: false }
  | { available: true; objective?: string; status?: string };

export type InspectionFact = {
  skillNames: string[];
  mcpServerNames: string[];
  diagnosticsSummary?: string;
  instructionSourceLabels?: string[];
  projectMcpSummary?: string;
  contextSnapshotLabel?: string;
  backgroundTasks?: BackgroundTaskFact[];
  installedPlugins?: string[];
  goal?: GoalStatusFact;
  delegationSummary?: string;
};

export type ForkOptionsFact = {
  canFork: boolean;
  unavailableReason?: string;
  suggestedTitle?: string;
};

export type SessionContext = {
  modeLabel?: string;
  modelLabel?: string;
  usageLabel?: string;
  usageCapLabel?: string;
  usageUsed?: number;
  usageSize?: number;
  currentModeId?: string;
  /** Studio `session/setMode` with `transition: next_turn` — capsule shows pending, not settled. */
  modePendingNextTurn?: boolean;
  pendingModeId?: string;
  availableModes?: SessionModeOption[];
  modelConfigId?: string;
  currentModelValue?: string;
  modelOptions?: SessionModelOption[];
  thinkingConfigId?: string;
  currentThinkingValue?: string;
  thinkingOptions?: SessionThinkingOption[];
  thinkingLabel?: string;
  availableCommands?: SessionSlashCommand[];
  gitBranch?: string;
  gitDetached?: boolean;
  gitIsRepo?: boolean;
  accountStatusLabel?: string;
};

export type ServiceSnapshot = {
  serviceEpoch: string;
  revision: number;
  connection: { status: ConnectionStatus; processEpoch: number };
  session: { status: SessionStatus; sessionId?: string; cwd?: string; historyLoadError?: string };
  turn: { status: TurnStatus; turnId?: string; prompt?: string; stopReason?: string };
  context: SessionContext;
  sessions: SessionIndexItem[];
  sessionListError?: string;
  agent: { sessionDelete: boolean };
  messages: MessageFact[];
  timeline: TimelineItem[];
  tools: ToolFact[];
  approvals: ApprovalFact[];
  interactions: SessionInteractions;
  queue: QueueItemFact[];
  inspection: InspectionFact;
  inputSummaries: InputSummaryFact[];
  errors: string[];
};

export type ServiceAction =
  | { type: 'send_prompt'; operationId: string; sessionId: string; prompt: string }
  | { type: 'execute_slash'; operationId: string; sessionId: string; name: string; input: string }
  | { type: 'cancel'; operationId: string; sessionId: string }
  | { type: 'reply_approval'; operationId: string; sessionId: string; requestId: string; optionId: string }
  | { type: 'switch_workspace'; operationId: string; cwd: string }
  | { type: 'set_mode'; operationId: string; sessionId: string; modeId: string }
  | { type: 'set_config_option'; operationId: string; sessionId: string; configId: string; value: string }
  | { type: 'new_session'; operationId: string; cwd: string }
  | { type: 'load_session'; operationId: string; sessionId: string; cwd: string }
  | { type: 'delete_session'; operationId: string; sessionId: string; cwd: string }
  | { type: 'rename_session'; operationId: string; sessionId: string; cwd: string; title: string }
  | { type: 'archive_session'; operationId: string; sessionId: string; cwd: string; archived: boolean }
  | {
      type: 'reply_questionnaire';
      operationId: string;
      sessionId: string;
      requestId: string;
      answers: QuestionnaireReplyAnswer[];
    }
  | { type: 'dismiss_questionnaire'; operationId: string; sessionId: string; requestId: string }
  | { type: 'search_workspace_files'; operationId: string; cwd: string; query: string }
  | { type: 'list_workspace_files'; operationId: string; cwd: string; path?: string }
  | { type: 'steer_turn'; operationId: string; sessionId: string; text: string }
  | { type: 'enqueue_message'; operationId: string; sessionId: string; text: string }
  | { type: 'delete_queue_item'; operationId: string; sessionId: string; itemId: string }
  | { type: 'continue_queue'; operationId: string; sessionId: string }
  | {
      type: 'preview_rewind';
      operationId: string;
      sessionId: string;
      userMessageId: string;
    }
  | {
      type: 'rewind_session';
      operationId: string;
      sessionId: string;
      userMessageId: string;
      rewindTurnDiff?: boolean;
    }
  | {
      type: 'preview_fork';
      operationId: string;
      sessionId: string;
      assistantMessageId?: string;
    }
  | {
      type: 'fork_session';
      operationId: string;
      sessionId: string;
      cwd: string;
      assistantMessageId?: string;
    }
  | {
      type: 'edit_session_message';
      operationId: string;
      sessionId: string;
      userMessageId: string;
      content: string;
    }
  | { type: 'steer_queue_item'; operationId: string; sessionId: string; itemId: string }
  | {
      type: 'update_queue_item';
      operationId: string;
      sessionId: string;
      itemId: string;
      text: string;
    }
  | { type: 'retry_session_history'; operationId: string; sessionId: string; cwd: string };
