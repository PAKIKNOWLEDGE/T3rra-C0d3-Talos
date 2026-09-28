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
  | { kind: 'session.created'; processEpoch: number; sessionId: string; cwd: string }
  | { kind: 'session.loaded'; processEpoch: number; sessionId: string; cwd: string }
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

export type ServiceSnapshot = {
  serviceEpoch: string;
  revision: number;
  connection: { status: ConnectionStatus; processEpoch: number };
  session: { status: SessionStatus; sessionId?: string; cwd?: string };
  turn: { status: TurnStatus; turnId?: string; prompt?: string; stopReason?: string };
  messages: MessageFact[];
  tools: ToolFact[];
  approvals: ApprovalFact[];
  errors: string[];
};

export type ServiceAction =
  | { type: 'send_prompt'; operationId: string; sessionId: string; prompt: string }
  | { type: 'cancel'; operationId: string; sessionId: string }
  | { type: 'reply_approval'; operationId: string; sessionId: string; requestId: string; optionId: string };
