import type {
  EngineEvent,
  MessageFact,
  ServiceSnapshot,
  SessionIndexItem,
  TimelineItem,
  ToolFact,
} from './types.js';

export class FactStore {
  private readonly state: ServiceSnapshot;

  constructor(serviceEpoch: string) {
    this.state = {
      serviceEpoch,
      revision: 0,
      connection: { status: 'disconnected', processEpoch: 0 },
      session: { status: 'none' },
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
    };
  }

  snapshot(): ServiceSnapshot {
    return structuredClone(this.state);
  }

  restoreSnapshot(snapshot: ServiceSnapshot) {
    this.state = structuredClone(snapshot);
    this.state.revision += 1;
  }

  prepareForWorkspaceSwitch(processEpoch: number) {
    this.state.connection = { status: 'connecting', processEpoch };
    this.state.session = { status: 'loading' };
    this.state.turn = { status: 'idle' };
    this.state.context = {};
    this.state.sessions = [];
    this.state.sessionListError = undefined;
    this.state.agent = { sessionDelete: false };
    this.state.messages = [];
    this.state.timeline = [];
    this.state.tools = [];
    this.state.approvals = [];
    this.state.interactions = {};
    this.state.queue = [];
    this.state.inspection = { skillNames: [], mcpServerNames: [] };
    this.state.inputSummaries = [];
    this.state.revision += 1;
  }

  prepareForSessionSwitch(sessionId: string, cwd: string) {
    this.state.session = { status: 'loading', sessionId, cwd };
    this.state.turn = { status: 'idle' };
    this.state.context = {};
    this.state.messages = [];
    this.state.timeline = [];
    this.state.tools = [];
    this.state.approvals = [];
    this.state.interactions = {};
    this.state.queue = [];
    this.state.inspection = { skillNames: [], mcpServerNames: [] };
    this.state.inputSummaries = [];
    this.state.revision += 1;
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
      case 'agent.capabilities':
        this.state.agent = { sessionDelete: event.sessionDelete };
        break;
      case 'session.deleted':
        this.state.sessions = this.state.sessions.filter((row) => row.sessionId !== event.sessionId);
        if (this.state.session.sessionId === event.sessionId) {
          this.state.session = {
            status: 'none',
            ...(this.state.session.cwd ? { cwd: this.state.session.cwd } : {}),
          };
          this.state.messages = [];
          this.state.timeline = [];
          this.state.tools = [];
          this.state.approvals = [];
          this.state.context = {};
          this.state.interactions = {};
          this.state.queue = [];
          this.state.inspection = { skillNames: [], mcpServerNames: [] };
          this.state.inputSummaries = [];
        }
        break;
      case 'disconnected':
        this.state.connection.status = 'disconnected';
        if (event.error) this.state.errors.push(event.error);
        break;
      case 'session.created':
      case 'session.loaded':
        this.state.session = { status: 'ready', sessionId: event.sessionId, cwd: event.cwd };
        this.upsertListedSession({ sessionId: event.sessionId, cwd: event.cwd });
        break;
      case 'session.history':
        if (this.state.session.sessionId === event.sessionId) {
          this.state.messages = structuredClone(event.messages);
          this.state.timeline = structuredClone(event.timeline);
          this.state.tools = structuredClone(event.tools);
          this.state.session = { ...this.state.session, historyLoadError: undefined };
        }
        break;
      case 'session.history_error':
        if (this.state.session.sessionId === event.sessionId) {
          this.state.session = { ...this.state.session, historyLoadError: event.message };
        }
        break;
      case 'stream.notice':
        this.state.timeline.push({
          kind: 'notice',
          noticeId: event.noticeId,
          text: event.text,
        });
        break;
      case 'session.listed':
        this.state.sessions = structuredClone(event.sessions);
        this.state.sessionListError = undefined;
        break;
      case 'session.run_state': {
        const index = this.state.sessions.findIndex((row) => row.sessionId === event.sessionId);
        if (index >= 0) {
          this.state.sessions[index] = { ...this.state.sessions[index], running: event.running };
        }
        break;
      }
      case 'session.list_error':
        this.state.sessionListError = event.message;
        this.state.errors.push(event.message);
        break;
      case 'interaction.updated':
        if (this.state.session.sessionId === event.sessionId) {
          this.state.interactions = structuredClone(event.interactions);
        }
        break;
      case 'session.queue':
        if (this.state.session.sessionId === event.sessionId) {
          this.state.queue = structuredClone(event.items);
        }
        break;
      case 'session.inspection':
        if (this.state.session.sessionId === event.sessionId) {
          this.state.inspection = structuredClone(event.inspection);
          this.state.inputSummaries = structuredClone(event.inputSummaries);
        }
        break;
      case 'session.context':
        this.state.context = { ...this.state.context, ...structuredClone(event.context) };
        const ctx = this.state.context;
        if (ctx.currentModeId && ctx.availableModes?.length) {
          const mode = ctx.availableModes.find((item) => item.id === ctx.currentModeId);
          if (mode) ctx.modeLabel = mode.name;
        }
        if (ctx.currentModelValue && ctx.modelOptions?.length) {
          const model = ctx.modelOptions.find((item) => item.value === ctx.currentModelValue);
          if (model) ctx.modelLabel = model.name;
        }
        if (ctx.currentThinkingValue && ctx.thinkingOptions?.length) {
          const thinking = ctx.thinkingOptions.find((item) => item.value === ctx.currentThinkingValue);
          if (thinking) ctx.thinkingLabel = thinking.name;
        }
        break;
      case 'turn.started':
        this.state.session.status = 'running';
        this.state.turn = { status: 'running', turnId: event.turnId, prompt: event.prompt };
        if (this.state.session.sessionId) {
          const index = this.state.sessions.findIndex(
            (row) => row.sessionId === this.state.session.sessionId,
          );
          if (index >= 0) this.state.sessions[index] = { ...this.state.sessions[index], running: true };
        }
        break;
      case 'user.message':
        this.appendMessage({ messageId: event.messageId, role: 'user', text: event.text });
        this.appendTimelineUser(event.messageId, event.text);
        break;
      case 'slash.completed':
        this.appendMessage({ messageId: event.messageId, role: 'user', text: event.command });
        this.appendTimelineUser(event.messageId, event.command);
        this.appendMessage({ messageId: event.replyId, role: 'assistant', text: event.output });
        this.appendTimelineAssistant(event.replyId, event.output);
        break;
      case 'thought.delta':
        this.appendTimelineThought(event.thoughtId, event.text);
        break;
      case 'assistant.delta': {
        const trimmed = event.text.trim();
        if (!trimmed) break;
        const existing = this.state.messages.find((message) => message.messageId === event.messageId);
        if (existing) {
          existing.text += event.text;
        } else if (
          !this.state.messages.some(
            (message) => message.role === 'assistant' && message.text.trim() === trimmed,
          )
        ) {
          this.appendMessage({ messageId: event.messageId, role: 'assistant', text: event.text });
        }
        this.appendTimelineAssistant(event.messageId, event.text);
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
        if (this.state.session.sessionId) {
          const index = this.state.sessions.findIndex(
            (row) => row.sessionId === this.state.session.sessionId,
          );
          if (index >= 0) this.state.sessions[index] = { ...this.state.sessions[index], running: false };
        }
        break;
      case 'error':
        this.state.connection.status = 'error';
        this.state.errors.push(event.message);
        break;
    }
    this.state.revision += 1;
    return true;
  }

  private appendMessage(message: MessageFact) {
    const existing = this.state.messages.find((item) => item.messageId === message.messageId);
    if (existing) existing.text += message.text;
    else this.state.messages.push(structuredClone(message));
  }

  private appendTimelineUser(messageId: string, text: string) {
    const trimmed = text.trim();
    const last = this.state.timeline.at(-1);
    if (last?.kind === 'user' && last.messageId === messageId) {
      last.text += text;
      return;
    }
    if (trimmed && last?.kind === 'user' && last.text.trim() === trimmed) return;
    this.state.timeline.push({ kind: 'user', messageId, text });
  }

  private appendTimelineThought(thoughtId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const last = this.state.timeline.at(-1);
    if (last?.kind === 'thought' && last.thoughtId === thoughtId) {
      last.text += text;
      return;
    }
    if (this.state.timeline.some((item) => item.kind === 'thought' && item.text.trim() === trimmed)) {
      return;
    }
    this.state.timeline.push({ kind: 'thought', thoughtId, text });
  }

  private appendTimelineAssistant(messageId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const last = this.state.timeline.at(-1);
    if (last?.kind === 'assistant' && last.messageId === messageId) {
      last.text += text;
      return;
    }
    if (last?.kind === 'assistant' && last.text.trim() === trimmed) return;
    if (this.state.timeline.some((item) => item.kind === 'assistant' && item.text.trim() === trimmed)) {
      return;
    }
    this.state.timeline.push({ kind: 'assistant', messageId, text });
  }

  private upsertListedSession(item: SessionIndexItem) {
    const existing = this.state.sessions.find((session) => session.sessionId === item.sessionId);
    if (existing) {
      if (!existing.title && item.title) existing.title = item.title;
      if (!existing.updatedAt && item.updatedAt) existing.updatedAt = item.updatedAt;
      existing.cwd = item.cwd;
      return;
    }
    this.state.sessions.unshift(structuredClone(item));
  }

  private upsertTool(toolCallId: string, patch: Omit<ToolFact, 'toolCallId'>) {
    const existing = this.state.tools.find((tool) => tool.toolCallId === toolCallId);
    if (existing) {
      Object.assign(existing, structuredClone(patch));
      return;
    }
    this.state.tools.push({ toolCallId, ...structuredClone(patch) });
    if (!this.state.timeline.some((item) => item.kind === 'tool' && item.toolCallId === toolCallId)) {
      this.state.timeline.push({ kind: 'tool', toolCallId });
    }
  }
}
