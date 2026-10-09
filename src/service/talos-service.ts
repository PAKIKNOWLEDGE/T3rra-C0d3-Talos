import { randomUUID } from 'node:crypto';
import type { FactStore } from '../core/fact-store.js';
import type { EngineEvent, ServiceAction, ServiceSnapshot } from '../core/types.js';

export interface EnginePort {
  sendPrompt(sessionId: string, prompt: string): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  replyApproval(sessionId: string, requestId: string, optionId: string): Promise<void>;
  setMode(sessionId: string, modeId: string): Promise<void>;
  setConfigOption(sessionId: string, configId: string, value: string): Promise<void>;
  createSession(cwd: string): Promise<void>;
  loadSession(sessionId: string, cwd: string): Promise<void>;
  deleteSession(sessionId: string, cwd: string): Promise<void>;
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
      throw new Error('当前这条活还在生成。请先停止，再切换或新建。');
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
        const current = this.store.snapshot().session.sessionId;
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
          throw new Error('当前 Talos 不支持删除会话。请安装 talos 0.1.3 或更新 PATH 中的 talos。');
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
    }
  }

  static createEpoch() {
    return randomUUID();
  }
}
