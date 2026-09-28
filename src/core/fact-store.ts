import type { EngineEvent, MessageFact, ServiceSnapshot, ToolFact } from './types.js';

export class FactStore {
  private readonly state: ServiceSnapshot;

  constructor(serviceEpoch: string) {
    this.state = {
      serviceEpoch,
      revision: 0,
      connection: { status: 'disconnected', processEpoch: 0 },
      session: { status: 'none' },
      turn: { status: 'idle' },
      messages: [],
      tools: [],
      approvals: [],
      errors: [],
    };
  }

  snapshot(): ServiceSnapshot {
    return structuredClone(this.state);
  }

  apply(event: EngineEvent): boolean {
    if (event.processEpoch < this.state.connection.processEpoch) return false;
    if (event.processEpoch > this.state.connection.processEpoch) {
      this.state.connection.processEpoch = event.processEpoch;
      this.state.connection.status = 'connecting';
    }
    switch (event.kind) {
      case 'connected':
        this.state.connection.status = 'connected';
        break;
      case 'disconnected':
        this.state.connection.status = 'disconnected';
        if (event.error) this.state.errors.push(event.error);
        break;
      case 'session.created':
      case 'session.loaded':
        this.state.session = { status: 'ready', sessionId: event.sessionId, cwd: event.cwd };
        break;
      case 'turn.started':
        this.state.session.status = 'running';
        this.state.turn = { status: 'running', turnId: event.turnId, prompt: event.prompt };
        break;
      case 'user.message':
        this.upsertMessage({ messageId: event.messageId, role: 'user', text: event.text });
        break;
      case 'assistant.delta': {
        const existing = this.state.messages.find((message) => message.messageId === event.messageId);
        if (existing) existing.text += event.text;
        else this.upsertMessage({ messageId: event.messageId, role: 'assistant', text: event.text });
        break;
      }
      case 'tool.update':
        this.upsertTool(event.toolCallId, event.patch);
        break;
      case 'approval.requested':
        this.state.approvals = [
          ...this.state.approvals.filter((approval) => approval.requestId !== event.approval.requestId),
          structuredClone(event.approval),
        ];
        break;
      case 'approval.settled': {
        const approval = this.state.approvals.find((item) => item.requestId === event.requestId);
        if (approval) approval.status = event.status;
        break;
      }
      case 'turn.finished':
        this.state.session.status = 'ready';
        this.state.turn = {
          status:
            event.stopReason === 'cancelled'
              ? 'cancelled'
              : event.stopReason === 'error'
                ? 'failed'
                : 'completed',
          turnId: event.turnId,
          prompt: this.state.turn.prompt,
          stopReason: event.stopReason,
        };
        break;
      case 'error':
        this.state.connection.status = 'error';
        this.state.errors.push(event.message);
        break;
    }
    this.state.revision += 1;
    return true;
  }

  private upsertMessage(message: MessageFact) {
    const existing = this.state.messages.find((item) => item.messageId === message.messageId);
    if (existing) existing.text = message.text;
    else this.state.messages.push(structuredClone(message));
  }

  private upsertTool(toolCallId: string, patch: Omit<ToolFact, 'toolCallId'>) {
    const existing = this.state.tools.find((tool) => tool.toolCallId === toolCallId);
    if (existing) Object.assign(existing, structuredClone(patch));
    else this.state.tools.push({ toolCallId, ...structuredClone(patch) });
  }
}
