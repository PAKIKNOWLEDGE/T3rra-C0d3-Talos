import { randomUUID } from 'node:crypto';
import type { EngineEvent } from '../core/types.js';
import { extractSessionContext } from './session-control.js';
import { listPageLimit, nextListCursor, parseSessionIndex } from './session-index.js';
import { StudioJsonRpcClient } from './studio-jsonrpc.js';
import { TurnStreamProjector, mapTurnCompletedStatus } from './studio-stream.js';
import { mapStudioHistoryMessages } from './session-history.js';
import { parseAvailableCommands } from './slash-commands.js';
import {
  executeStudioSlashCommand,
  newSlashResultIds,
  slashCommandLine,
} from './studio-slash.js';
import { mapStudioUsageToContext, mergeUsageSummaryPayload } from './usage-from-studio.js';
import { workspaceListEntriesToPaths } from './workspace-file-list.js';
import {
  DEFAULT_STUDIO_AGENT_NAME,
  buildInteractionsFromStudio,
  readSessionAgentName,
} from './studio-questionnaire.js';
import type { QuestionnaireReplyAnswer } from '../core/types.js';
import {
  formatRewindPreviewText,
  parseInspectionBundle,
  parseInputSummaries,
  parseQueueItems,
} from './studio-inspection.js';
import { parseForkOptions } from './studio-fork.js';
import type { ForkOptionsFact } from '../core/types.js';
import { formatAccountStatus } from './studio-account.js';
export type StudioEventSink = (event: EngineEvent) => void;

type PendingPermissionMeta = {
  sessionId: string;
  agentName: string;
};

type TurnWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
};

export type StudioInitializeResult = {
  protocolVersion: number;
  serverName: string;
  productVersion?: string;
  cwd: string;
};

export class TalosStudioAdapter {
  private turnCounter = 0;
  private readonly activeTurnBySession = new Map<string, string>();
  private readonly turnWaiters = new Map<string, TurnWaiter>();
  private readonly permissionMeta = new Map<string, PendingPermissionMeta>();
  private readonly seenPermissionIds = new Set<string>();
  private readonly watchedTurns = new Set<string>();
  private readonly turnProjector = new TurnStreamProjector();
  private readonly sessionAgentNames = new Map<string, string>();
  private readonly sessionCwdById = new Map<string, string>();
  private lastListedCwd?: string;
  private attachedSessionId?: string;
  private permissionPollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly rpc: StudioJsonRpcClient,
    private readonly processEpoch: number,
    private readonly emit: StudioEventSink,
  ) {
    this.emit({ kind: 'connected', processEpoch: this.processEpoch });
    this.permissionPollTimer = setInterval(() => {
      void this.pollPermissions();
    }, 1500);
  }

  static attach(
    rpc: StudioJsonRpcClient,
    processEpoch: number,
    emit: StudioEventSink,
  ): TalosStudioAdapter {
    return new TalosStudioAdapter(rpc, processEpoch, emit);
  }

  handleNotification(method: string, params: unknown) {
    if (method === 'runtime/event') {
      const record = params && typeof params === 'object' ? (params as { event?: unknown }) : {};
      const event = record.event;
      if (event && typeof event === 'object') {
        const type = (event as { type?: string }).type;
        if (type === 'usage_update' || type === 'context_usage_update') {
          const sessionId = (event as { sessionId?: string }).sessionId;
          if (sessionId) void this.refreshUsage(sessionId);
        }
        if (
          this.lastListedCwd &&
          (type === 'session.title_updated' ||
            type === 'session.created' ||
            type === 'session.deleted' ||
            type === 'session.pinned_updated')
        ) {
          void this.listSessions(this.lastListedCwd);
        }
      }
      return;
    }
    if (method === 'usage/commit') {
      const record = params && typeof params === 'object' ? (params as { sessionId?: string }) : {};
      if (record.sessionId) void this.refreshUsage(record.sessionId);
      return;
    }
    if (method === 'turn/event') {
      const record = params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const sessionId = typeof record.sessionId === 'string' ? record.sessionId : '';
      if (!sessionId) return;
      const turnId = typeof record.turnId === 'string' ? record.turnId : undefined;
      for (const event of this.turnProjector.project(
        this.processEpoch,
        sessionId,
        record.event,
        turnId,
      )) {
        if (event.kind === 'session.history_resync') {
          this.emit(event);
          void this.hydrateSessionHistory(sessionId);
          continue;
        }
        this.emit(event);
      }
      void this.pollPermissions();
      return;
    }
    if (method === 'turn/completed') {
      const record = params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
      const sessionId = typeof record.sessionId === 'string' ? record.sessionId : '';
      const turnId = typeof record.turnId === 'string' ? record.turnId : '';
      const status = typeof record.status === 'string' ? record.status : 'failed';
      if (sessionId && turnId) {
        this.emit({
          kind: 'turn.finished',
          processEpoch: this.processEpoch,
          sessionId,
          turnId,
          stopReason: mapTurnCompletedStatus(status),
        });
        const key = turnKey(sessionId, turnId);
        const waiter = this.turnWaiters.get(key);
        if (waiter) {
          this.turnWaiters.delete(key);
          if (status === 'failed') {
            const errorText = typeof record.error === 'string' ? record.error : 'Turn failed.';
            waiter.reject(new Error(errorText));
          } else {
            waiter.resolve();
          }
        }
        if (this.activeTurnBySession.get(sessionId) === turnId) {
          this.activeTurnBySession.delete(sessionId);
        }
        this.watchedTurns.delete(turnKey(sessionId, turnId));
        this.turnProjector.reset();
        void this.refreshUsage(sessionId);
        void this.refreshInteractions(sessionId);
        void this.refreshSessionAuxiliary(sessionId);
      }
      void this.pollPermissions();
    }
  }

  async initialize(cwd: string): Promise<StudioInitializeResult> {
    const result = (await this.rpc.request('studio/initialize', { cwd })) as StudioInitializeResult;
    await this.refreshAccountStatus();
    void this.rpc.request('runtime/events/subscribe', {}).catch(() => {});
    void this.rpc.request('usage/commits/subscribe', {}).catch(() => {});
    return result;
  }

  async createSession(cwd: string) {
    const result = await this.rpc.request('session/create', { cwd });
    const sessionId = readSessionId(result);
    if (!sessionId) throw new Error('session/create did not return sessionId.');
    this.emit({ kind: 'session.created', processEpoch: this.processEpoch, sessionId, cwd });
    this.markAttached(sessionId);
    await this.emitSessionBundle(sessionId, result);
    await this.hydrateSessionHistory(sessionId);
    await this.syncActiveRun(sessionId);
    await this.refreshWorkspaceGit(sessionId, cwd);
    return { sessionId };
  }

  async loadSession(sessionId: string, cwd: string) {
    const result = await this.rpc.request('session/load', { sessionId, cwd });
    this.emit({ kind: 'session.loaded', processEpoch: this.processEpoch, sessionId, cwd });
    this.markAttached(sessionId);
    await this.emitSessionBundle(sessionId, result);
    await this.hydrateSessionHistory(sessionId);
    await this.syncActiveRun(sessionId);
    await this.refreshWorkspaceGit(sessionId, cwd);
    return result;
  }

  async retrySessionHistory(sessionId: string): Promise<void> {
    await this.hydrateSessionHistory(sessionId);
  }

  async resumeSession(sessionId: string, cwd: string) {
    const result = await this.rpc.request('session/resume', { sessionId });
    this.emit({ kind: 'session.loaded', processEpoch: this.processEpoch, sessionId, cwd });
    this.markAttached(sessionId);
    await this.emitSessionBundle(sessionId, result);
    await this.hydrateSessionHistory(sessionId);
    await this.syncActiveRun(sessionId);
    await this.refreshWorkspaceGit(sessionId, cwd);
    return result;
  }

  async deleteSession(sessionId: string) {
    await this.rpc.request('session/delete', { sessionId });
    if (this.attachedSessionId === sessionId) this.attachedSessionId = undefined;
    this.emit({ kind: 'session.deleted', processEpoch: this.processEpoch, sessionId });
  }

  async renameSession(sessionId: string, title: string, cwd: string) {
    await this.rpc.request('session/rename', { sessionId, title });
    await this.listSessions(cwd);
  }

  async archiveSession(sessionId: string, archived: boolean, cwd: string) {
    await this.rpc.request('session/archive', { sessionId, archived });
    await this.listSessions(cwd);
  }

  async replyQuestionnaire(sessionId: string, requestId: string, answers: QuestionnaireReplyAnswer[]) {
    const agentName = this.sessionAgentNames.get(sessionId) ?? DEFAULT_STUDIO_AGENT_NAME;
    await this.rpc.request('questionnaire/reply', { agentName, requestId, answers });
    await this.refreshInteractions(sessionId);
  }

  async dismissQuestionnaire(sessionId: string, requestId: string) {
    const agentName = this.sessionAgentNames.get(sessionId) ?? DEFAULT_STUDIO_AGENT_NAME;
    await this.rpc.request('questionnaire/dismiss', { agentName, requestId });
    await this.refreshInteractions(sessionId);
  }

  async steerTurn(sessionId: string, text: string) {
    await this.rpc.request('turn/steer', {
      sessionId,
      text,
      clientRequestId: randomUUID(),
    });
  }

  async enqueueMessage(sessionId: string, text: string) {
    await this.rpc.request('queue/enqueue', { sessionId, text });
    await this.refreshQueue(sessionId);
  }

  async deleteQueueItem(sessionId: string, itemId: string) {
    await this.rpc.request('queue/delete', { sessionId, itemId });
    await this.refreshQueue(sessionId);
  }

  async continueQueue(sessionId: string) {
    await this.rpc.request('queue/continue', { sessionId });
    await this.refreshQueue(sessionId);
  }

  async steerQueueItem(sessionId: string, itemId: string) {
    await this.rpc.request('queue/steer', { sessionId, itemId });
    await this.refreshQueue(sessionId);
  }

  async updateQueueItem(sessionId: string, itemId: string, text: string) {
    await this.rpc.request('queue/update', { sessionId, itemId, text });
    await this.refreshQueue(sessionId);
  }

  async getForkOptions(sessionId: string, assistantMessageId?: string): Promise<ForkOptionsFact> {
    const raw = await this.rpc.request('session/forkOptions', {
      sessionId,
      ...(assistantMessageId ? { assistantMessageId } : {}),
    });
    return parseForkOptions(raw);
  }

  async forkSession(sessionId: string, cwd: string, assistantMessageId?: string): Promise<string> {
    const options = await this.getForkOptions(sessionId, assistantMessageId);
    if (!options.canFork) {
      throw new Error(options.unavailableReason ?? '当前无法分叉此会话。');
    }
    const result = await this.rpc.request('session/fork', {
      sessionId,
      useSuggestedTitle: true,
      ...(assistantMessageId ? { assistantMessageId } : {}),
    });
    const newSessionId = readSessionId(result);
    if (!newSessionId) throw new Error('session/fork 未返回新 sessionId。');
    await this.listSessions(cwd);
    return newSessionId;
  }

  async editSessionMessage(sessionId: string, userMessageId: string, content: string) {
    await this.rpc.request('session/editMessage', {
      sessionId,
      userMessageId,
      content,
    });
    await this.hydrateSessionHistory(sessionId);
    await this.refreshSessionAuxiliary(sessionId);
  }

  async previewRewind(sessionId: string, userMessageId: string) {
    const response = await this.rpc.request('session/rewindPreview', {
      sessionId,
      userMessageId,
    });
    return formatRewindPreviewText(
      response && typeof response === 'object' ? (response as { preview?: unknown }).preview : undefined,
    );
  }

  async rewindSession(sessionId: string, userMessageId: string, rewindTurnDiff = false) {
    await this.rpc.request('session/rewind', {
      sessionId,
      userMessageId,
      ...(rewindTurnDiff ? { rewindTurnDiff: true } : {}),
    });
    await this.hydrateSessionHistory(sessionId);
    await this.refreshInteractions(sessionId);
    await this.refreshSessionAuxiliary(sessionId);
  }

  async searchWorkspaceFiles(cwd: string, query: string, limit = 20): Promise<string[]> {
    const response = (await this.rpc.request('workspace/files/search', {
      workspaceDir: cwd,
      query,
      limit,
    })) as { paths?: unknown };
    if (!Array.isArray(response.paths)) return [];
    return response.paths.map((item) => String(item));
  }

  async listWorkspaceFiles(cwd: string, path?: string, limit = 40): Promise<string[]> {
    const response = (await this.rpc.request('workspace/files/list', {
      workspaceDir: cwd,
      ...(path ? { path } : {}),
    })) as { entries?: unknown };
    return workspaceListEntriesToPaths(response.entries, limit);
  }

  private markAttached(sessionId: string) {
    this.attachedSessionId = sessionId;
  }

  private async detachAttachedSession() {
    const sessionId = this.attachedSessionId;
    if (!sessionId) return;
    this.attachedSessionId = undefined;
    try {
      await this.rpc.request('session/close', { sessionId });
    } catch {
      /* already detached or process exiting */
    }
  }

  async listSessions(cwd: string) {
    this.lastListedCwd = cwd;
    try {
      const collected: unknown[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < listPageLimit(); page += 1) {
        const result = await this.rpc.request('session/list', {
          cwd,
          ...(cursor ? { cursor } : {}),
        });
        collected.push(result);
        const next = nextListCursor(result);
        if (!next) break;
        cursor = next;
      }
      const sessions = parseSessionIndex({
        sessions: collected.flatMap((page) => parseSessionIndex(page)),
      });
      this.emit({ kind: 'session.listed', processEpoch: this.processEpoch, cwd, sessions });
      void this.refreshSessionRunMarkers(sessions.map((item) => item.sessionId));
      return sessions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({ kind: 'session.list_error', processEpoch: this.processEpoch, cwd, message });
      throw error;
    }
  }

  async executeSlash(sessionId: string, name: string, input: string) {
    const { messageId, replyId } = newSlashResultIds();
    const command = slashCommandLine(name, input);
    try {
      const commands = await this.rpc.request('commands/list', { sessionId });
      const advertised =
        parseAvailableCommands(
          commands && typeof commands === 'object'
            ? (commands as { commands?: unknown }).commands
            : undefined,
        ) ?? [];
      const output = await executeStudioSlashCommand({
        rpc: this.rpc,
        sessionId,
        name,
        input,
        advertised,
      });
      this.emit({
        kind: 'slash.completed',
        processEpoch: this.processEpoch,
        sessionId,
        messageId,
        replyId,
        command,
        output,
      });
      if (name === 'model' || name === 'compact') {
        const options = await this.rpc.request('config/options', { sessionId });
        this.emitSessionContext(sessionId, options);
        await this.refreshUsage(sessionId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({
        kind: 'slash.completed',
        processEpoch: this.processEpoch,
        sessionId,
        messageId,
        replyId,
        command,
        output: message,
      });
    }
  }

  async sendPrompt(sessionId: string, prompt: string) {
    const turnId = `local-turn-${++this.turnCounter}`;
    this.turnProjector.reset();
    this.emit({ kind: 'turn.started', processEpoch: this.processEpoch, sessionId, turnId, prompt });
    try {
      this.activeTurnBySession.set(sessionId, turnId);
      let waitPromise = this.waitForTurn(sessionId, turnId);
      const started = (await this.rpc.request('turn/start', {
        sessionId,
        input: prompt,
        turnId,
      })) as { turnId?: string };
      const serverTurnId = started.turnId ?? turnId;
      if (serverTurnId !== turnId) {
        this.turnWaiters.delete(turnKey(sessionId, turnId));
        this.activeTurnBySession.set(sessionId, serverTurnId);
        waitPromise = this.waitForTurn(sessionId, serverTurnId);
      }
      await waitPromise;
    } catch (error) {
      this.emit({
        kind: 'error',
        processEpoch: this.processEpoch,
        sessionId,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async cancel(sessionId: string) {
    const turnId = this.activeTurnBySession.get(sessionId);
    await this.rpc.request('turn/cancel', { sessionId, ...(turnId ? { turnId } : {}) });
  }

  async setMode(sessionId: string, modeId: string) {
    const result = (await this.rpc.request('session/setMode', { sessionId, modeId })) as {
      modes?: unknown;
      transition?: string;
    };
    const context = extractSessionContext(result) ?? {};
    if (result.transition === 'next_turn') {
      context.modePendingNextTurn = true;
      context.pendingModeId = modeId;
      const match = context.availableModes?.find((item) => item.id === modeId);
      if (match?.name) context.modeLabel = `${match.name}（下回合生效）`;
    } else {
      context.modePendingNextTurn = false;
      context.pendingModeId = undefined;
      context.currentModeId = modeId;
      const match = context.availableModes?.find((item) => item.id === modeId);
      if (match?.name) context.modeLabel = match.name;
    }
    this.emit({ kind: 'session.context', processEpoch: this.processEpoch, sessionId, context });
  }

  async setConfigOption(sessionId: string, configId: string, value: string) {
    const result = await this.rpc.request('config/set', { sessionId, configId, value });
    this.emitSessionContext(sessionId, result);
    await this.refreshUsage(sessionId);
  }

  replyApproval(sessionId: string, requestId: string, optionId: string) {
    const meta = this.permissionMeta.get(requestId);
    if (!meta || meta.sessionId !== sessionId) return false;
    const decision = mapApprovalDecision(optionId);
    void this.rpc
      .request('permission/reply', {
        agentName: meta.agentName,
        requestId,
        decision,
      })
      .then(() => {
        this.permissionMeta.delete(requestId);
        this.seenPermissionIds.delete(requestId);
        this.emit({
          kind: 'approval.settled',
          processEpoch: this.processEpoch,
          sessionId,
          requestId,
          status: 'settled',
        });
      })
      .catch((error) => {
        this.emit({
          kind: 'error',
          processEpoch: this.processEpoch,
          sessionId,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  }

  close(error?: unknown) {
    void this.detachAttachedSession();
    if (this.permissionPollTimer) clearInterval(this.permissionPollTimer);
    for (const waiter of this.turnWaiters.values()) {
      waiter.reject(error instanceof Error ? error : new Error('Studio adapter closed.'));
    }
    this.turnWaiters.clear();
    this.rpc.close(error instanceof Error ? error : undefined);
    this.emit({
      kind: 'disconnected',
      processEpoch: this.processEpoch,
      ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}),
    });
  }

  private async refreshSessionRunMarkers(sessionIds: string[]) {
    const unique = [...new Set(sessionIds)].slice(0, 40);
    for (const sessionId of unique) {
      try {
        const response = (await this.rpc.request('session/activeRun', { sessionId })) as {
          activeRun?: { turnId?: string; state?: string } | null;
        };
        const run = response.activeRun;
        const running =
          Boolean(run && typeof run.turnId === 'string' && run.turnId) ||
          run?.state === 'running' ||
          run?.state === 'active';
        this.emit({
          kind: 'session.run_state',
          processEpoch: this.processEpoch,
          sessionId,
          running,
        });
      } catch {
        /* ignore per-session probe failures */
      }
    }
  }

  private async syncActiveRun(sessionId: string) {
    try {
      const response = (await this.rpc.request('session/activeRun', { sessionId })) as {
        activeRun?: { turnId?: string } | null;
      };
      const turnId =
        response.activeRun && typeof response.activeRun.turnId === 'string'
          ? response.activeRun.turnId
          : undefined;
      if (!turnId) return;
      const key = turnKey(sessionId, turnId);
      if (this.watchedTurns.has(key)) return;
      this.watchedTurns.add(key);
      this.activeTurnBySession.set(sessionId, turnId);
      this.turnProjector.reset();
      if (!this.turnWaiters.has(key)) {
        void this.waitForTurn(sessionId, turnId);
      }
      this.emit({
        kind: 'turn.started',
        processEpoch: this.processEpoch,
        sessionId,
        turnId,
        prompt: '',
      });
      this.emit({
        kind: 'session.run_state',
        processEpoch: this.processEpoch,
        sessionId,
        running: true,
      });
      await this.rpc.request('turn/watch', { sessionId, turnId });
    } catch {
      /* reconnect watch is best-effort */
    }
  }

  private waitForTurn(sessionId: string, turnId: string): Promise<void> {
    const key = turnKey(sessionId, turnId);
    return new Promise((resolve, reject) => {
      this.turnWaiters.set(key, { resolve, reject });
    });
  }

  private async refreshWorkspaceGit(sessionId: string, cwd: string) {
    try {
      const response = (await this.rpc.request('workspace/git', { workspaceDir: cwd })) as {
        metadata?: { isGitRepo?: boolean; branch?: string; detached?: boolean };
      };
      const metadata = response.metadata;
      if (!metadata) return;
      this.emit({
        kind: 'session.context',
        processEpoch: this.processEpoch,
        sessionId,
        context: {
          gitIsRepo: metadata.isGitRepo === true,
          ...(metadata.branch ? { gitBranch: metadata.branch } : {}),
          gitDetached: metadata.detached === true,
        },
      });
    } catch {
      /* non-git workspaces are normal */
    }
  }

  private async hydrateSessionHistory(sessionId: string) {
    try {
      const pages: unknown[][] = [];
      const seenCursors = new Set<string>();
      let before: string | undefined;
      for (let guard = 0; guard < 50; guard += 1) {
        const page = (await this.rpc.request('session/messages', {
          sessionId,
          limit: 200,
          ...(before ? { before } : {}),
        })) as { messages?: unknown[]; hasMore?: boolean; nextCursor?: string };
        pages.unshift(Array.isArray(page.messages) ? page.messages : []);
        if (!page.hasMore || !page.nextCursor || seenCursors.has(page.nextCursor)) break;
        seenCursors.add(page.nextCursor);
        before = page.nextCursor;
      }
      const { messages, timeline, tools } = mapStudioHistoryMessages(pages.flat());
      this.emit({
        kind: 'session.history',
        processEpoch: this.processEpoch,
        sessionId,
        messages,
        timeline,
        tools,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({
        kind: 'session.history_error',
        processEpoch: this.processEpoch,
        sessionId,
        message,
      });
      this.emit({
        kind: 'error',
        processEpoch: this.processEpoch,
        sessionId,
        message: `session/messages failed: ${message}`,
      });
    }
  }

  private async refreshAccountStatus(sessionId?: string) {
    try {
      const raw = await this.rpc.request('account/status', {
        ...(sessionId ? { sessionId } : {}),
      });
      const view = formatAccountStatus(raw);
      if (!view) return;
      if (sessionId) {
        this.emit({
          kind: 'session.context',
          processEpoch: this.processEpoch,
          sessionId,
          context: { accountStatusLabel: view.label },
        });
      } else {
        this.emit({
          kind: 'session.context',
          processEpoch: this.processEpoch,
          sessionId: '',
          context: { accountStatusLabel: view.label },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({
        kind: 'error',
        processEpoch: this.processEpoch,
        message: `account/status: ${message}`,
      });
    }
  }

  private rememberSessionAgent(sessionId: string, result: unknown) {
    const agentName = readSessionAgentName(result) ?? DEFAULT_STUDIO_AGENT_NAME;
    this.sessionAgentNames.set(sessionId, agentName);
    const cwd = readSessionCwd(result);
    if (cwd) this.sessionCwdById.set(sessionId, cwd);
  }

  private async refreshQueue(sessionId: string) {
    try {
      const raw = await this.rpc.request('queue/list', { sessionId });
      this.emit({
        kind: 'session.queue',
        processEpoch: this.processEpoch,
        sessionId,
        items: parseQueueItems(raw),
      });
    } catch {
      this.emit({
        kind: 'session.queue',
        processEpoch: this.processEpoch,
        sessionId,
        items: [],
      });
    }
  }

  private async refreshSessionAuxiliary(sessionId: string) {
    await this.refreshQueue(sessionId);
    const cwd = this.sessionCwd(sessionId);
    let skillsRaw: unknown;
    let mcpRaw: unknown;
    let diagnosticsRaw: unknown;
    let summariesRaw: unknown;
    let instructionRaw: unknown;
    let projectMcpRaw: unknown;
    try {
      skillsRaw = await this.rpc.request('inspection/skills', {
        sessionId,
        ...(cwd ? { workspaceDir: cwd } : {}),
      });
    } catch {
      skillsRaw = undefined;
    }
    try {
      mcpRaw = await this.rpc.request('inspection/mcp', { sessionId });
    } catch {
      mcpRaw = undefined;
    }
    try {
      diagnosticsRaw = await this.rpc.request('inspection/diagnostics', {});
    } catch {
      diagnosticsRaw = undefined;
    }
    try {
      summariesRaw = await this.rpc.request('session/inputSummaries', { sessionId, limit: 40 });
    } catch {
      summariesRaw = undefined;
    }
    if (cwd) {
      try {
        instructionRaw = await this.rpc.request('inspection/instructionSources', { workspaceDir: cwd });
      } catch {
        instructionRaw = undefined;
      }
    }
    try {
      projectMcpRaw = await this.rpc.request('inspection/projectMcp', { sessionId });
    } catch {
      projectMcpRaw = undefined;
    }
    let contextRaw: unknown;
    let backgroundRaw: unknown;
    let pluginsRaw: unknown;
    let goalRaw: unknown;
    let goalDisabled = false;
    let delegationRaw: unknown;
    try {
      contextRaw = await this.rpc.request('inspection/context', { sessionId });
    } catch {
      contextRaw = undefined;
    }
    try {
      backgroundRaw = await this.rpc.request('backgroundTasks/list', { sessionId });
    } catch {
      backgroundRaw = undefined;
    }
    try {
      pluginsRaw = await this.rpc.request('plugins/listInstalled', {});
    } catch {
      pluginsRaw = undefined;
    }
    try {
      goalRaw = await this.rpc.request('goal/get', { sessionId });
    } catch (error) {
      goalRaw = undefined;
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('disabled') || message.includes('Goal feature')) {
        goalDisabled = true;
      }
    }
    try {
      delegationRaw = await this.rpc.request('delegation/get', { sessionId });
    } catch {
      delegationRaw = undefined;
    }
    const inspection = parseInspectionBundle(
      skillsRaw,
      mcpRaw,
      diagnosticsRaw,
      instructionRaw,
      projectMcpRaw,
      contextRaw,
      backgroundRaw,
      pluginsRaw,
      goalRaw,
      goalDisabled,
      delegationRaw,
    );
    const inputSummaries = parseInputSummaries(summariesRaw);
    this.emit({
      kind: 'session.inspection',
      processEpoch: this.processEpoch,
      sessionId,
      inspection,
      inputSummaries,
    });
  }

  private sessionCwd(sessionId: string): string | undefined {
    return this.sessionCwdById.get(sessionId) ?? this.lastListedCwd;
  }

  private async refreshInteractions(sessionId: string) {
    const agentName = this.sessionAgentNames.get(sessionId) ?? DEFAULT_STUDIO_AGENT_NAME;
    let pendingRaw: unknown;
    let planReviewRaw: unknown;
    try {
      pendingRaw = await this.rpc.request('questionnaire/getPending', { agentName, sessionId });
    } catch {
      pendingRaw = undefined;
    }
    try {
      planReviewRaw = await this.rpc.request('questionnaire/getPlanReview', { agentName, sessionId });
    } catch {
      planReviewRaw = undefined;
    }
    const interactions = buildInteractionsFromStudio(agentName, pendingRaw, planReviewRaw);
    this.emit({
      kind: 'interaction.updated',
      processEpoch: this.processEpoch,
      sessionId,
      interactions,
    });
  }

  private async emitSessionBundle(sessionId: string, result: unknown) {
    this.rememberSessionAgent(sessionId, result);
    const commands = await this.rpc.request('commands/list', { sessionId });
    const availableCommands =
      commands && typeof commands === 'object' && Array.isArray((commands as { commands?: unknown }).commands)
        ? { availableCommands: (commands as { commands: unknown[] }).commands }
        : {};
    const merged =
      result && typeof result === 'object'
        ? { ...(result as object), ...availableCommands }
        : availableCommands;
    this.emitSessionContext(sessionId, merged);
    await this.refreshUsage(sessionId);
    await this.refreshAccountStatus(sessionId);
    await this.refreshInteractions(sessionId);
    await this.refreshSessionAuxiliary(sessionId);
  }

  private emitSessionContext(sessionId: string, result: unknown) {
    const context = extractSessionContext(result);
    if (!context) return;
    this.emit({ kind: 'session.context', processEpoch: this.processEpoch, sessionId, context });
  }

  private async refreshUsage(sessionId: string) {
    try {
      const usageResult = (await this.rpc.request('inspection/usage', { sessionId })) as {
        usage?: unknown;
      };
      let usagePayload = (usageResult.usage ?? {}) as Parameters<typeof mapStudioUsageToContext>[0];
      try {
        const summaryResult = (await this.rpc.request('inspection/usageSummary', {
          sessionId,
        })) as { summary?: unknown };
        usagePayload = mergeUsageSummaryPayload(usagePayload, summaryResult.summary);
      } catch {
        /* usageSummary optional when runtime omits port */
      }
      let contextResult: { snapshot?: unknown } | undefined;
      try {
        contextResult = (await this.rpc.request('inspection/context', { sessionId })) as {
          snapshot?: unknown;
        };
      } catch {
        contextResult = undefined;
      }
      const context = mapStudioUsageToContext(
        usagePayload,
        contextResult as Parameters<typeof mapStudioUsageToContext>[1],
      );
      if (Object.keys(context).length) {
        this.emit({
          kind: 'session.context',
          processEpoch: this.processEpoch,
          sessionId,
          context,
        });
      }
    } catch {
      /* usage is optional */
    }
  }

  private async pollPermissions() {
    try {
      const result = (await this.rpc.request('permission/list', {})) as {
        permissions?: unknown[];
      };
      const list = Array.isArray(result.permissions) ? result.permissions : [];
      for (const raw of list) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        const requestId = typeof row.requestId === 'string' ? row.requestId : '';
        const sessionId = typeof row.sessionId === 'string' ? row.sessionId : '';
        const agentName = typeof row.agentName === 'string' ? row.agentName : '';
        if (!requestId || !sessionId || !agentName) continue;
        if (this.seenPermissionIds.has(requestId)) continue;
        this.seenPermissionIds.add(requestId);
        this.permissionMeta.set(requestId, { sessionId, agentName });
        const toolCallId =
          typeof row.toolName === 'string' && row.toolName
            ? row.toolName
            : requestId;
        const options = buildPermissionOptions(row.allowAlwaysSupported === true);
        this.emit({
          kind: 'approval.requested',
          processEpoch: this.processEpoch,
          sessionId,
          approval: {
            requestId,
            toolCallId,
            options,
            status: 'pending',
          },
        });
      }
    } catch {
      /* polling is best-effort */
    }
  }
}

function turnKey(sessionId: string, turnId: string) {
  return `${sessionId}:${turnId}`;
}

function readSessionCwd(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const session = (result as { session?: { workspaceDir?: string } }).session;
  const cwd = session?.workspaceDir;
  return typeof cwd === 'string' && cwd.trim() ? cwd.trim() : undefined;
}

function readSessionId(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const session = (result as { session?: { sessionId?: string } }).session;
  if (session?.sessionId) return session.sessionId;
  const direct = (result as { sessionId?: string }).sessionId;
  return typeof direct === 'string' ? direct : undefined;
}

function mapApprovalDecision(optionId: string): 'allowOnce' | 'allowAlways' | 'deny' {
  if (optionId === 'allowOnce' || optionId === 'allowAlways' || optionId === 'deny') return optionId;
  if (optionId === 'allow_once' || optionId.includes('allow') && !optionId.includes('always')) {
    return 'allowOnce';
  }
  if (optionId === 'allow_always' || optionId.includes('always')) return 'allowAlways';
  return 'deny';
}

function buildPermissionOptions(allowAlwaysSupported: boolean) {
  const options = [
    { optionId: 'allowOnce', name: '允许一次', kind: 'allow_once' },
    ...(allowAlwaysSupported
      ? [{ optionId: 'allowAlways', name: '始终允许', kind: 'allow_always' as const }]
      : []),
    { optionId: 'deny', name: '拒绝', kind: 'reject_once' },
  ];
  return options;
}
