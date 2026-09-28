import { randomUUID } from 'node:crypto';
import type { FactStore } from '../core/fact-store.js';
import type { EngineEvent, ServiceAction, ServiceSnapshot } from '../core/types.js';

export interface EnginePort {
  sendPrompt(sessionId: string, prompt: string): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  replyApproval(sessionId: string, requestId: string, optionId: string): Promise<void>;
}

export class TalosService {
  private readonly operations = new Map<string, Promise<unknown>>();
  private readonly observers = new Set<(snapshot: ServiceSnapshot) => void>();

  constructor(private readonly store: FactStore, private readonly engine: EnginePort) {}

  snapshot() {
    return this.store.snapshot();
  }

  apply(event: EngineEvent) {
    if (!this.store.apply(event)) return false;
    const snapshot = this.snapshot();
    for (const observer of this.observers) observer(snapshot);
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
    }
  }

  static createEpoch() {
    return randomUUID();
  }
}
