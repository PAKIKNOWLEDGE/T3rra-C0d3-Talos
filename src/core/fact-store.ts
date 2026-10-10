import type {
  EngineEvent,
  MessageFact,
  ServiceSnapshot,
  SessionIndexItem,
  TimelineItem,
  ToolFact,
} from './types.js';

type TurnScoped = { sessionId?: string; turnId?: string };

const STREAM_TURN_SCOPED_KINDS = new Set<EngineEvent['kind']>([
  'user.message',
  'assistant.delta',
  'assistant.replace',
  'assistant.layout',
  'thought.delta',
  'thought.replace',
  'tool.update',
  'stream.notice',
  'error',
]);

const LIVE_FACT_DURING_RESYNC_KINDS = new Set<EngineEvent['kind']>([
  'assistant.delta',
  'assistant.replace',
  'assistant.layout',
  'thought.delta',
  'thought.replace',
  'tool.update',
  'session.history_replaced',
]);

const TURN_LIFECYCLE_KINDS = new Set<EngineEvent['kind']>(['turn.started', 'turn.finished']);

export class FactStore {
  private readonly state: ServiceSnapshot;
  private historyRequestSeq = 0;
  private latestHistoryRequestId = 0;
  private maxAppliedHistoryRequestId = 0;
  private readonly pendingHistoryRequestIds = new Set<number>();
  private readonly liveFactSkipHistoryRequestIds = new Set<number>();
  private liveStreamFactsDuringResync = false;

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
    this.resetHistoryRequestState();
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
    this.resetHistoryRequestState();
    this.state.revision += 1;
  }

  private resetHistoryRequestState() {
    this.historyRequestSeq = 0;
    this.latestHistoryRequestId = 0;
    this.maxAppliedHistoryRequestId = 0;
    this.pendingHistoryRequestIds.clear();
    this.liveFactSkipHistoryRequestIds.clear();
    this.liveStreamFactsDuringResync = false;
  }

  private shouldApply(event: EngineEvent): boolean {
    if (event.processEpoch < this.state.connection.processEpoch) return false;
    const scoped = event as EngineEvent & TurnScoped;
    if (scoped.sessionId) {
      const active = this.state.session.sessionId;
      if (active && scoped.sessionId !== active) return false;
    }
    if (event.kind === 'turn.finished') {
      if (!scoped.turnId || !this.state.turn.turnId || scoped.turnId !== this.state.turn.turnId) {
        return false;
      }
      if (this.state.turn.status !== 'running') return false;
    }
    if (scoped.turnId) {
      if (STREAM_TURN_SCOPED_KINDS.has(event.kind)) {
        if (this.state.turn.status !== 'running') return false;
        if (!this.state.turn.turnId || scoped.turnId !== this.state.turn.turnId) return false;
      } else if (
        !TURN_LIFECYCLE_KINDS.has(event.kind) &&
        this.state.turn.turnId &&
        scoped.turnId !== this.state.turn.turnId
      ) {
        return false;
      }
    }
    return true;
  }

  private applySessionHistory(
    event: Extract<EngineEvent, { kind: 'session.history' }>,
  ): void {
    const requestId = event.historyRequestId ?? 0;
    if (requestId > 0) {
      if (requestId < this.latestHistoryRequestId) {
        this.pendingHistoryRequestIds.delete(requestId);
        this.liveFactSkipHistoryRequestIds.delete(requestId);
        return;
      }
      if (requestId < this.maxAppliedHistoryRequestId) {
        this.pendingHistoryRequestIds.delete(requestId);
        this.liveFactSkipHistoryRequestIds.delete(requestId);
        return;
      }
      const skipBecauseLiveFacts = this.liveFactSkipHistoryRequestIds.has(requestId);
      this.pendingHistoryRequestIds.delete(requestId);
      this.liveFactSkipHistoryRequestIds.delete(requestId);
      if (skipBecauseLiveFacts) {
        return;
      }
      this.maxAppliedHistoryRequestId = Math.max(this.maxAppliedHistoryRequestId, requestId);
      this.liveStreamFactsDuringResync = false;
      this.state.messages = structuredClone(event.messages);
      this.state.timeline = structuredClone(event.timeline);
      this.state.tools = structuredClone(event.tools);
      this.state.session = { ...this.state.session, historyLoadError: undefined };
      return;
    }
    const skipBecauseLiveFacts = this.liveStreamFactsDuringResync;
    if (this.pendingHistoryRequestIds.size > 0) {
      const oldest = this.pendingHistoryRequestIds.values().next().value;
      if (oldest !== undefined) {
        this.pendingHistoryRequestIds.delete(oldest);
        this.liveFactSkipHistoryRequestIds.delete(oldest);
      }
    }
    if (skipBecauseLiveFacts) {
      return;
    }
    this.liveStreamFactsDuringResync = false;
    this.state.messages = structuredClone(event.messages);
    this.state.timeline = structuredClone(event.timeline);
    this.state.tools = structuredClone(event.tools);
    this.state.session = { ...this.state.session, historyLoadError: undefined };
  }

  apply(event: EngineEvent): boolean {
    if (!this.shouldApply(event)) return false;
    if (
      this.pendingHistoryRequestIds.size > 0 &&
      LIVE_FACT_DURING_RESYNC_KINDS.has(event.kind)
    ) {
      this.liveStreamFactsDuringResync = true;
      for (const requestId of this.pendingHistoryRequestIds) {
        this.liveFactSkipHistoryRequestIds.add(requestId);
      }
    }
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
          this.applySessionHistory(event);
        }
        break;
      case 'session.history_replaced':
        if (this.state.session.sessionId === event.sessionId) {
          for (const requestId of this.pendingHistoryRequestIds) {
            this.liveFactSkipHistoryRequestIds.add(requestId);
          }
          this.state.messages = structuredClone(event.messages);
          this.state.timeline = structuredClone(event.timeline);
          this.state.tools = structuredClone(event.tools);
          this.state.session = { ...this.state.session, historyLoadError: undefined };
        }
        break;
      case 'session.history_error':
        if (this.state.session.sessionId === event.sessionId) {
          if (event.historyRequestId !== undefined) {
            this.pendingHistoryRequestIds.delete(event.historyRequestId);
            this.liveFactSkipHistoryRequestIds.delete(event.historyRequestId);
          }
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
        this.setAssistantSlashReply(event.replyId, event.output);
        break;
      case 'thought.delta':
        this.appendTimelineThought(event.thoughtId, event.text);
        break;
      case 'thought.replace':
        this.replaceTimelineThought(event.thoughtId, event.text);
        break;
      case 'assistant.delta':
        this.appendAssistantDelta(event.messageId, event.text);
        break;
      case 'assistant.replace':
        this.replaceAssistantMessage(event.messageId, event.text);
        break;
      case 'assistant.layout':
        this.applyAssistantLayout(event.messageId, event.timeline, event.tools, event.combinedText);
        break;
      case 'session.history_resync': {
        const requestId = event.historyRequestId ?? ++this.historyRequestSeq;
        if (event.historyRequestId) {
          this.historyRequestSeq = Math.max(this.historyRequestSeq, event.historyRequestId);
        }
        this.latestHistoryRequestId = Math.max(this.latestHistoryRequestId, requestId);
        this.pendingHistoryRequestIds.add(requestId);
        this.liveStreamFactsDuringResync = false;
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

  private setAssistantMessageText(messageId: string, text: string) {
    const existing = this.state.messages.find(
      (message) => message.messageId === messageId && message.role === 'assistant',
    );
    if (existing) existing.text = text;
    else this.state.messages.push({ messageId, role: 'assistant', text });
  }

  private rebuildAssistantMessageText(messageId: string) {
    const text = this.state.timeline
      .filter((item): item is Extract<TimelineItem, { kind: 'assistant' }> =>
        item.kind === 'assistant' && item.messageId === messageId,
      )
      .map((item) => item.text)
      .join('');
    if (!text) {
      this.state.messages = this.state.messages.filter(
        (message) => message.messageId !== messageId || message.role !== 'assistant',
      );
      return;
    }
    this.setAssistantMessageText(messageId, text);
  }

  private lastAssistantSegment(messageId: string) {
    for (let index = this.state.timeline.length - 1; index >= 0; index -= 1) {
      const item = this.state.timeline[index];
      if (item?.kind === 'assistant' && item.messageId === messageId) return item;
      if (item?.kind === 'user') break;
    }
    return undefined;
  }

  private appendAssistantDelta(messageId: string, text: string) {
    if (!text) return;
    const last = this.state.timeline.at(-1);
    if (last?.kind === 'tool') {
      const segmentIndex = this.state.timeline.filter(
        (item) => item.kind === 'assistant' && item.messageId === messageId,
      ).length;
      this.state.timeline.push({ kind: 'assistant', messageId, segmentIndex, text });
    } else if (last?.kind === 'assistant' && last.messageId === messageId) {
      last.text += text;
    } else {
      const segment = this.lastAssistantSegment(messageId);
      if (segment && (last?.kind === 'notice' || last?.kind === 'thought')) {
        segment.text += text;
      } else {
        const segmentIndex = this.state.timeline.filter(
          (item) => item.kind === 'assistant' && item.messageId === messageId,
        ).length;
        this.state.timeline.push({ kind: 'assistant', messageId, segmentIndex, text });
      }
    }
    this.rebuildAssistantMessageText(messageId);
  }

  private replaceAssistantMessage(messageId: string, text: string) {
    this.removeAssistantRun(messageId);
    if (text) {
      this.state.timeline.push({ kind: 'assistant', messageId, segmentIndex: 0, text });
      this.setAssistantMessageText(messageId, text);
    }
  }

  private applyAssistantLayout(
    messageId: string,
    patchTimeline: TimelineItem[],
    patchTools: ToolFact[],
    combinedText: string,
  ) {
    this.removeAssistantRun(messageId);
    this.state.timeline.push(...structuredClone(patchTimeline));
    for (const tool of patchTools) {
      const existing = this.state.tools.find((row) => row.toolCallId === tool.toolCallId);
      if (existing) Object.assign(existing, structuredClone(tool));
      else this.state.tools.push(structuredClone(tool));
    }
    if (combinedText) this.setAssistantMessageText(messageId, combinedText);
    else this.rebuildAssistantMessageText(messageId);
  }

  private removeAssistantRun(messageId: string) {
    this.state.timeline = this.stripAssistantRun(this.state.timeline, messageId);
  }

  private stripAssistantRun(timeline: TimelineItem[], messageId: string): TimelineItem[] {
    const out: TimelineItem[] = [];
    let index = 0;
    while (index < timeline.length) {
      const item = timeline[index];
      if (item.kind === 'assistant' && item.messageId === messageId) {
        while (index < timeline.length) {
          const current = timeline[index];
          if (current.kind === 'assistant' && current.messageId === messageId) {
            index += 1;
            continue;
          }
          if (current.kind === 'tool') {
            index += 1;
            continue;
          }
          break;
        }
        continue;
      }
      out.push(item);
      index += 1;
    }
    return out;
  }

  private appendTimelineUser(messageId: string, text: string) {
    if (!text) return;
    const last = this.state.timeline.at(-1);
    if (last?.kind === 'user' && last.messageId === messageId) {
      last.text += text;
      return;
    }
    this.state.timeline.push({ kind: 'user', messageId, text });
  }

  private appendTimelineThought(thoughtId: string, text: string) {
    if (!text) return;
    const last = this.state.timeline.at(-1);
    if (last?.kind === 'thought' && last.thoughtId === thoughtId) {
      last.text += text;
      return;
    }
    this.state.timeline.push({ kind: 'thought', thoughtId, text });
  }

  private replaceTimelineThought(thoughtId: string, text: string) {
    const entry = this.state.timeline.find(
      (item): item is Extract<TimelineItem, { kind: 'thought' }> =>
        item.kind === 'thought' && item.thoughtId === thoughtId,
    );
    if (entry) entry.text = text;
    else if (text) this.state.timeline.push({ kind: 'thought', thoughtId, text });
  }

  private setAssistantSlashReply(messageId: string, text: string) {
    if (!text) return;
    this.setAssistantMessageText(messageId, text);
    const last = this.state.timeline.at(-1);
    if (last?.kind === 'assistant' && last.messageId === messageId) {
      last.text = text;
      return;
    }
    this.state.timeline.push({ kind: 'assistant', messageId, segmentIndex: 0, text });
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
