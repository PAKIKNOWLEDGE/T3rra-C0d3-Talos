import { randomUUID } from 'node:crypto';
import * as acp from '@agentclientprotocol/sdk';
import type { EngineEvent } from '../core/types.js';

export type MinimaxEventSink = (event: EngineEvent) => void;

export class MinimaxAcpAdapter {
  private readonly pendingApprovals = new Map<
    string,
    { resolve: (response: acp.RequestPermissionResponse) => void; sessionId: string }
  >();
  private turnCounter = 0;

  constructor(
    private readonly client: acp.ClientApp,
    private readonly connection: acp.ClientConnection,
    private readonly processEpoch: number,
    private readonly emit: MinimaxEventSink,
  ) {
    this.client.onNotification(acp.methods.client.session.update, ({ params }) => {
      this.handleUpdate(params);
    });
    this.client.onRequest(acp.methods.client.session.requestPermission, ({ params }) => {
      return new Promise<acp.RequestPermissionResponse>((resolve) => {
        this.pendingApprovals.set(params.toolCall.toolCallId, { resolve, sessionId: params.sessionId });
        this.emit({
          kind: 'approval.requested',
          processEpoch: this.processEpoch,
          sessionId: params.sessionId,
          approval: {
            requestId: params.toolCall.toolCallId,
            toolCallId: params.toolCall.toolCallId,
            options: params.options.map((option) => ({
              optionId: option.optionId,
              name: option.name,
              kind: option.kind,
            })),
            status: 'pending',
          },
        });
      });
    });
    this.emit({ kind: 'connected', processEpoch: this.processEpoch });
  }

  async createSession(cwd: string) {
    const result = await this.connection.agent.request(acp.methods.agent.session.new, {
      cwd,
      mcpServers: [],
    });
    this.emit({ kind: 'session.created', processEpoch: this.processEpoch, sessionId: result.sessionId, cwd });
    return result;
  }

  async loadSession(sessionId: string, cwd: string) {
    const result = await this.connection.agent.request(acp.methods.agent.session.load, {
      sessionId,
      cwd,
      mcpServers: [],
    });
    this.emit({ kind: 'session.loaded', processEpoch: this.processEpoch, sessionId, cwd });
    return result;
  }

  async sendPrompt(sessionId: string, prompt: string) {
    const turnId = `local-turn-${++this.turnCounter}`;
    const messageId = `local-user-${randomUUID()}`;
    this.emit({ kind: 'turn.started', processEpoch: this.processEpoch, sessionId, turnId, prompt });
    this.emit({ kind: 'user.message', processEpoch: this.processEpoch, sessionId, messageId, text: prompt });
    try {
      const result = await this.connection.agent.request(acp.methods.agent.session.prompt, {
        sessionId,
        prompt: [{ type: 'text', text: prompt }],
      });
      this.emit({
        kind: 'turn.finished',
        processEpoch: this.processEpoch,
        sessionId,
        turnId,
        stopReason:
          result.stopReason === 'end_turn' ||
          result.stopReason === 'cancelled' ||
          result.stopReason === 'max_turn_requests'
            ? result.stopReason
            : 'error',
      });
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
    await this.connection.agent.notify(acp.methods.agent.session.cancel, { sessionId });
  }

  replyApproval(sessionId: string, requestId: string, optionId: string) {
    const pending = this.pendingApprovals.get(requestId);
    if (!pending || pending.sessionId !== sessionId) return false;
    this.pendingApprovals.delete(requestId);
    pending.resolve({ outcome: { outcome: 'selected', optionId } });
    this.emit({
      kind: 'approval.settled',
      processEpoch: this.processEpoch,
      sessionId,
      requestId,
      status: 'settled',
    });
    return true;
  }

  close(error?: unknown) {
    for (const [requestId, pending] of this.pendingApprovals) {
      pending.resolve({ outcome: { outcome: 'cancelled' } });
      this.pendingApprovals.delete(requestId);
    }
    this.connection.close(error);
    this.emit({
      kind: 'disconnected',
      processEpoch: this.processEpoch,
      ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}),
    });
  }

  private handleUpdate(notification: acp.SessionNotification) {
    const { sessionId, update } = notification;
    if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') {
      this.emit({
        kind: 'assistant.delta',
        processEpoch: this.processEpoch,
        sessionId,
        messageId: update.messageId ?? `assistant-${randomUUID()}`,
        text: update.content.text,
      });
      return;
    }
    if (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update') {
      const toolCall = update.toolCall;
      if (!toolCall) return;
      this.emit({
        kind: 'tool.update',
        processEpoch: this.processEpoch,
        sessionId,
        toolCallId: toolCall.toolCallId,
        patch: {
          ...(toolCall.title ? { title: toolCall.title } : {}),
          ...(toolCall.kind ? { kind: toolCall.kind } : {}),
          ...(toolCall.status ? { status: toolCall.status } : {}),
          ...(toolCall.rawInput !== undefined ? { rawInput: toolCall.rawInput } : {}),
          ...(toolCall.rawOutput !== undefined ? { rawOutput: toolCall.rawOutput } : {}),
          ...(toolCall.locations ? { locations: toolCall.locations.map((location) => location.path) } : {}),
        },
      });
    }
  }
}
