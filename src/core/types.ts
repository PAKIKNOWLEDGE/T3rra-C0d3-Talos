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
      kind: 'session.listed';
      processEpoch: number;
      cwd: string;
      sessions: SessionIndexItem[];
    }
  | { kind: 'session.list_error'; processEpoch: number; cwd: string; message: string }
  | { kind: 'session.context'; processEpoch: number; sessionId: string; context: SessionContext }
  | { kind: 'turn.started'; processEpoch: number; sessionId: string; turnId: string; prompt: string }
  | { kind: 'user.message'; processEpoch: number; sessionId: string; messageId: string; text: string }
  | {
      kind: 'assistant.delta';
      processEpoch: number;
      sessionId: string;
      messageId: string;
      text: string;
    }
  | {
      kind: 'tool.update';
      processEpoch: number;
      sessionId: string;
      toolCallId: string;
      patch: Omit<ToolFact, 'toolCallId'>;
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
      kind: 'error';
      processEpoch: number;
      message: string;
      sessionId?: string;
    };

export type SessionModeOption = { id: string; name: string };
export type SessionModelOption = { value: string; name: string };

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
};

export type SessionContext = {
  modeLabel?: string;
  modelLabel?: string;
  usageLabel?: string;
  usageCapLabel?: string;
  currentModeId?: string;
  availableModes?: SessionModeOption[];
  modelConfigId?: string;
  currentModelValue?: string;
  modelOptions?: SessionModelOption[];
  availableCommands?: SessionSlashCommand[];
};

export type ServiceSnapshot = {
  serviceEpoch: string;
  revision: number;
  connection: { status: ConnectionStatus; processEpoch: number };
  session: { status: SessionStatus; sessionId?: string; cwd?: string };
  turn: { status: TurnStatus; turnId?: string; prompt?: string; stopReason?: string };
  context: SessionContext;
  sessions: SessionIndexItem[];
  sessionListError?: string;
  agent: { sessionDelete: boolean };
  messages: MessageFact[];
  tools: ToolFact[];
  approvals: ApprovalFact[];
  errors: string[];
};

export type ServiceAction =
  | { type: 'send_prompt'; operationId: string; sessionId: string; prompt: string }
  | { type: 'cancel'; operationId: string; sessionId: string }
  | { type: 'reply_approval'; operationId: string; sessionId: string; requestId: string; optionId: string }
  | { type: 'switch_workspace'; operationId: string; cwd: string }
  | { type: 'set_mode'; operationId: string; sessionId: string; modeId: string }
  | { type: 'set_config_option'; operationId: string; sessionId: string; configId: string; value: string }
  | { type: 'new_session'; operationId: string; cwd: string }
  | { type: 'load_session'; operationId: string; sessionId: string; cwd: string }
  | { type: 'delete_session'; operationId: string; sessionId: string; cwd: string };
