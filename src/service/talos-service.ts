import { randomUUID } from 'node:crypto';
import type { FactStore } from '../core/fact-store.js';
import type {
  EngineEvent,
  ForkOptionsFact,
  QuestionnaireReplyAnswer,
  ServiceAction,
  ServiceSnapshot,
} from '../core/types.js';

export interface EnginePort {
  sendPrompt(sessionId: string, prompt: string): Promise<void>;
  executeSlash(sessionId: string, name: string, input: string): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  replyApproval(sessionId: string, requestId: string, optionId: string): Promise<void>;
  setMode(sessionId: string, modeId: string): Promise<void>;
  setConfigOption(sessionId: string, configId: string, value: string): Promise<void>;
  createSession(cwd: string): Promise<void>;
  loadSession(sessionId: string, cwd: string): Promise<void>;
  deleteSession(sessionId: string, cwd: string): Promise<void>;
  renameSession(sessionId: string, title: string, cwd: string): Promise<void>;
  archiveSession(sessionId: string, archived: boolean, cwd: string): Promise<void>;
  replyQuestionnaire(
    sessionId: string,
    requestId: string,
    answers: QuestionnaireReplyAnswer[],
  ): Promise<void>;
  dismissQuestionnaire(sessionId: string, requestId: string): Promise<void>;
  searchWorkspaceFiles(cwd: string, query: string): Promise<string[]>;
  listWorkspaceFiles(cwd: string, path?: string): Promise<string[]>;
  steerTurn(sessionId: string, text: string): Promise<void>;
  enqueueMessage(sessionId: string, text: string): Promise<void>;
  deleteQueueItem(sessionId: string, itemId: string): Promise<void>;
  continueQueue(sessionId: string): Promise<void>;
  previewRewind(sessionId: string, userMessageId: string): Promise<string>;
  rewindSession(sessionId: string, userMessageId: string, rewindTurnDiff?: boolean): Promise<void>;
  steerQueueItem(sessionId: string, itemId: string): Promise<void>;
  getForkOptions(sessionId: string, assistantMessageId?: string): Promise<ForkOptionsFact>;
  forkSession(sessionId: string, cwd: string, assistantMessageId?: string): Promise<string>;
  editSessionMessage(sessionId: string, userMessageId: string, content: string): Promise<void>;
  updateQueueItem(sessionId: string, itemId: string, text: string): Promise<void>;
  retrySessionHistory(sessionId: string): Promise<void>;
}

export interface WorkspaceHost {
  switchWorkspace(cwd: string): Promise<void>;
}

export class TalosService {
  private readonly operations = new Map<string, Promise<unknown>>();
  private readonly observers = new Set<(snapshot: ServiceSnapshot) => void>();

  constructor(
    private readonly store: FactStore,
    private readonly engine: EnginePort,
    private readonly workspace?: WorkspaceHost,
  ) {}

  snapshot() {
    return this.store.snapshot();
  }

  private broadcast() {
    const snapshot = this.snapshot();
    for (const observer of this.observers) observer(snapshot);
  }

  prepareWorkspaceSwitch(nextProcessEpoch: number) {
    this.store.prepareForWorkspaceSwitch(nextProcessEpoch);
    this.broadcast();
  }

  prepareSessionSwitch(sessionId: string, cwd: string) {
    this.store.prepareForSessionSwitch(sessionId, cwd);
    this.broadcast();
  }

  private assertTurnIdle() {
    const turn = this.store.snapshot().turn.status;
    if (turn === 'running' || turn === 'stopping') {
      throw new Error('当前会话正在执行。请先停止，再切换或新建。');
    }
  }

  apply(event: EngineEvent) {
    if (!this.store.apply(event)) return false;
    this.broadcast();
    return true;
  }

  observe(observer: (snapshot: ServiceSnapshot) => void) {
    this.observers.add(observer);
    observer(this.snapshot());
    return () => this.observers.delete(observer);
  }

  dispatch(action: ServiceAction): Promise<unknown> {
    const existing = this.operations.get(action.operationId);
    if (existing) return existing;
    const operation = this.execute(action);
    this.operations.set(action.operationId, operation);
    return operation;
  }

  private async execute(action: ServiceAction) {
    switch (action.type) {
      case 'send_prompt':
        await this.engine.sendPrompt(action.sessionId, action.prompt);
        return { operationId: action.operationId, accepted: true };
      case 'execute_slash':
        await this.engine.executeSlash(action.sessionId, action.name, action.input);
        return { operationId: action.operationId, accepted: true };
      case 'cancel':
        await this.engine.cancel(action.sessionId);
        return { operationId: action.operationId, accepted: true };
      case 'reply_approval':
        await this.engine.replyApproval(action.sessionId, action.requestId, action.optionId);
        return { operationId: action.operationId, accepted: true };
      case 'switch_workspace':
        if (!this.workspace) throw new Error('当前环境不支持切换工作区。');
        await this.workspace.switchWorkspace(action.cwd);
        return { operationId: action.operationId, accepted: true };
      case 'set_mode':
        await this.engine.setMode(action.sessionId, action.modeId);
        return { operationId: action.operationId, accepted: true };
      case 'set_config_option':
        await this.engine.setConfigOption(action.sessionId, action.configId, action.value);
        return { operationId: action.operationId, accepted: true };
      case 'new_session': {
        this.assertTurnIdle();
        const rollback = this.store.snapshot();
        this.prepareSessionSwitch('', action.cwd);
        try {
          await this.engine.createSession(action.cwd);
        } catch (error) {
          this.store.restoreSnapshot(rollback);
          this.broadcast();
          throw error;
        }
        return { operationId: action.operationId, accepted: true };
      }
      case 'load_session': {
        this.assertTurnIdle();
        const snap = this.store.snapshot();
        const target = snap.sessions.find((row) => row.sessionId === action.sessionId);
        if (target?.running && target.sessionId !== snap.session.sessionId) {
          throw new Error('该会话仍在执行。请在运行此会话的终端停止任务后再切换。');
        }
        const current = snap.session.sessionId;
        if (current === action.sessionId) {
          return { operationId: action.operationId, accepted: true };
        }
        const rollback = this.store.snapshot();
        this.prepareSessionSwitch(action.sessionId, action.cwd);
        try {
          await this.engine.loadSession(action.sessionId, action.cwd);
        } catch (error) {
          this.store.restoreSnapshot(rollback);
          this.broadcast();
          throw error;
        }
        return { operationId: action.operationId, accepted: true };
      }
      case 'delete_session': {
        this.assertTurnIdle();
        const snap = this.store.snapshot();
        if (!snap.agent.sessionDelete) {
          throw new Error('当前 Talos 不支持删除会话。');
        }
        const isCurrent = snap.session.sessionId === action.sessionId;
        const rollback = this.store.snapshot();
        try {
          await this.engine.deleteSession(action.sessionId, action.cwd);
        } catch (error) {
          throw error;
        }
        if (isCurrent) {
          const remaining = this.store.snapshot().sessions;
          if (remaining.length > 0) {
            const nextId = remaining[0].sessionId;
            const rollbackAfterDelete = this.store.snapshot();
            this.prepareSessionSwitch(nextId, action.cwd);
            try {
              await this.engine.loadSession(nextId, action.cwd);
            } catch (error) {
              this.store.restoreSnapshot(rollbackAfterDelete);
              this.broadcast();
              throw error;
            }
          } else {
            this.prepareSessionSwitch('', action.cwd);
            try {
              await this.engine.createSession(action.cwd);
            } catch (error) {
              this.store.restoreSnapshot(rollback);
              this.broadcast();
              throw error;
            }
          }
        }
        return { operationId: action.operationId, accepted: true };
      }
      case 'rename_session': {
        this.assertTurnIdle();
        const title = action.title.trim();
        if (!title) throw new Error('标题不能为空。');
        await this.engine.renameSession(action.sessionId, title, action.cwd);
        return { operationId: action.operationId, accepted: true };
      }
      case 'archive_session': {
        this.assertTurnIdle();
        await this.engine.archiveSession(action.sessionId, action.archived, action.cwd);
        return { operationId: action.operationId, accepted: true };
      }
      case 'reply_questionnaire': {
        await this.engine.replyQuestionnaire(action.sessionId, action.requestId, action.answers);
        return { operationId: action.operationId, accepted: true };
      }
      case 'dismiss_questionnaire': {
        await this.engine.dismissQuestionnaire(action.sessionId, action.requestId);
        return { operationId: action.operationId, accepted: true };
      }
      case 'search_workspace_files': {
        const paths = await this.engine.searchWorkspaceFiles(action.cwd, action.query);
        return { operationId: action.operationId, paths };
      }
      case 'list_workspace_files': {
        const paths = await this.engine.listWorkspaceFiles(action.cwd, action.path);
        return { operationId: action.operationId, paths };
      }
      case 'steer_turn': {
        await this.engine.steerTurn(action.sessionId, action.text);
        return { operationId: action.operationId, accepted: true };
      }
      case 'enqueue_message': {
        await this.engine.enqueueMessage(action.sessionId, action.text);
        return { operationId: action.operationId, accepted: true };
      }
      case 'delete_queue_item': {
        await this.engine.deleteQueueItem(action.sessionId, action.itemId);
        return { operationId: action.operationId, accepted: true };
      }
      case 'continue_queue': {
        await this.engine.continueQueue(action.sessionId);
        return { operationId: action.operationId, accepted: true };
      }
      case 'preview_rewind': {
        const preview = await this.engine.previewRewind(action.sessionId, action.userMessageId);
        return { operationId: action.operationId, preview };
      }
      case 'rewind_session': {
        this.assertTurnIdle();
        await this.engine.rewindSession(
          action.sessionId,
          action.userMessageId,
          action.rewindTurnDiff,
        );
        return { operationId: action.operationId, accepted: true };
      }
      case 'steer_queue_item': {
        await this.engine.steerQueueItem(action.sessionId, action.itemId);
        return { operationId: action.operationId, accepted: true };
      }
      case 'preview_fork': {
        const options = await this.engine.getForkOptions(
          action.sessionId,
          action.assistantMessageId,
        );
        return { operationId: action.operationId, options };
      }
      case 'fork_session': {
        this.assertTurnIdle();
        const newSessionId = await this.engine.forkSession(
          action.sessionId,
          action.cwd,
          action.assistantMessageId,
        );
        const rollback = this.store.snapshot();
        this.prepareSessionSwitch(newSessionId, action.cwd);
        try {
          await this.engine.loadSession(newSessionId, action.cwd);
        } catch (error) {
          this.store.restoreSnapshot(rollback);
          this.broadcast();
          throw error;
        }
        return { operationId: action.operationId, accepted: true, sessionId: newSessionId };
      }
      case 'edit_session_message': {
        this.assertTurnIdle();
        const content = action.content.trim();
        if (!content) throw new Error('编辑内容不能为空。');
        await this.engine.editSessionMessage(action.sessionId, action.userMessageId, content);
        return { operationId: action.operationId, accepted: true };
      }
      case 'update_queue_item': {
        const text = action.text.trim();
        if (!text) throw new Error('队列内容不能为空。');
        await this.engine.updateQueueItem(action.sessionId, action.itemId, text);
        return { operationId: action.operationId, accepted: true };
      }
      case 'retry_session_history': {
        const snap = this.store.snapshot();
        if (snap.session.sessionId !== action.sessionId) {
          throw new Error('会话已切换，请重新载入原会话。');
        }
        await this.engine.retrySessionHistory(action.sessionId);
        return { operationId: action.operationId, accepted: true };
      }
    }
  }

  static createEpoch() {
    return randomUUID();
  }
}
