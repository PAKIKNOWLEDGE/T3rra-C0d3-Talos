import { randomUUID } from 'node:crypto';
import * as acp from '@agentclientprotocol/sdk';
import type { EngineEvent } from '../core/types.js';
import { sanitizeAssistantDisplay, textFromSessionUpdate } from './acp-text.js';
import { extractSessionContext } from './session-control.js';
import { parseAvailableCommands } from './slash-commands.js';
import { mapUsageUpdateToContext } from './usage-from-acp.js';
import { listPageLimit, nextListCursor, parseSessionIndex } from './session-index.js';

export type MinimaxEventSink = (event: EngineEvent) => void;

type AcpAdapterHolder = { adapter: MinimaxAcpAdapter | undefined };

/**
 * ACP client handlers must be registered before `client.connect(stream)`;
 * otherwise early `session/update` notifications (e.g. `available_commands_update`) are dropped.
 */
export function readSessionDeleteCapability(initialized: {
  agentCapabilities?: { sessionCapabilities?: Record<string, unknown> | null };
}): boolean {
  const caps = initialized.agentCapabilities?.sessionCapabilities;
  return Boolean(caps && typeof caps === 'object' && caps.delete != null);
}

export function prepareTalosAcpClient(): { client: acp.ClientApp; holder: AcpAdapterHolder } {
  const client = acp.client({ name: 'talos-service' });
  const holder: AcpAdapterHolder = { adapter: undefined };
  client.onNotification(acp.methods.client.session.update, ({ params }) => {
    holder.adapter?.receiveSessionNotification(params);
  });
  client.onRequest(acp.methods.client.session.requestPermission, ({ params }) => {
    const adapter = holder.adapter;
    if (!adapter) {
      return Promise.resolve({ outcome: { outcome: 'cancelled' } });
    }
    return adapter.handlePermissionRequest(params);
  });
  return { client, holder };
}

export class MinimaxAcpAdapter {
  private readonly pendingApprovals = new Map<
    string,
    { resolve: (response: acp.RequestPermissionResponse) => void; sessionId: string }
  >();
  private turnCounter = 0;

  constructor(
    private readonly connection: acp.ClientConnection,
    private readonly processEpoch: number,
    private readonly emit: MinimaxEventSink,
  ) {
    this.emit({ kind: 'connected', processEpoch: this.processEpoch });
  }

  static attach(
    holder: AcpAdapterHolder,
    connection: acp.ClientConnection,
    processEpoch: number,
    emit: MinimaxEventSink,
  ) {
    const adapter = new MinimaxAcpAdapter(connection, processEpoch, emit);
    holder.adapter = adapter;
    return adapter;
  }

  receiveSessionNotification(notification: acp.SessionNotification) {
    this.handleUpdate(notification);
  }

  handlePermissionRequest(params: acp.RequestPermissionRequest) {
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
  }

  async createSession(cwd: string) {
    const result = await this.connection.agent.request(acp.methods.agent.session.new, {
      cwd,
      mcpServers: [],
    });
    this.emit({ kind: 'session.created', processEpoch: this.processEpoch, sessionId: result.sessionId, cwd });
    this.emitSessionContext(result.sessionId, result);
    return result;
  }

  async loadSession(sessionId: string, cwd: string) {
    const result = await this.connection.agent.request(acp.methods.agent.session.load, {
      sessionId,
      cwd,
      mcpServers: [],
    });
    this.emit({ kind: 'session.loaded', processEpoch: this.processEpoch, sessionId, cwd });
    this.emitSessionContext(sessionId, result);
    return result;
  }

  async deleteSession(sessionId: string) {
    await this.connection.agent.request(acp.methods.agent.session.delete, { sessionId });
    this.emit({ kind: 'session.deleted', processEpoch: this.processEpoch, sessionId });
  }

  async listSessions(cwd: string) {
    try {
      const collected: unknown[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < listPageLimit(); page += 1) {
        const result = await this.connection.agent.request(acp.methods.agent.session.list, {
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
      return sessions;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({ kind: 'session.list_error', processEpoch: this.processEpoch, cwd, message });
      throw error;
    }
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

  async setMode(sessionId: string, modeId: string) {
    await this.connection.agent.request(acp.methods.agent.session.setMode, { sessionId, modeId });
    this.emit({
      kind: 'session.context',
      processEpoch: this.processEpoch,
      sessionId,
      context: { currentModeId: modeId },
    });
  }

  async setConfigOption(sessionId: string, configId: string, value: string) {
    const result = await this.connection.agent.request(acp.methods.agent.session.setConfigOption, {
      sessionId,
      configId,
      value,
    });
    this.emitSessionContext(sessionId, result);
  }

  async replyApproval(sessionId: string, requestId: string, optionId: string): Promise<void> {
    const pending = this.pendingApprovals.get(requestId);
    if (!pending || pending.sessionId !== sessionId) {
      throw new Error('Approval request is stale or unknown.');
    }
    this.pendingApprovals.delete(requestId);
    pending.resolve({ outcome: { outcome: 'selected', optionId } });
    this.emit({
      kind: 'approval.settled',
      processEpoch: this.processEpoch,
      sessionId,
      requestId,
      status: 'settled',
    });
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

  private emitSessionContext(sessionId: string, result: unknown) {
    const context = extractSessionContext(result);
    if (!context) return;
    this.emit({ kind: 'session.context', processEpoch: this.processEpoch, sessionId, context });
  }

  private handleUpdate(notification: acp.SessionNotification) {
    const { sessionId, update } = notification;
    const text = textFromSessionUpdate(update);
    if (update.sessionUpdate === 'user_message_chunk' && text) {
      this.emit({
        kind: 'user.message',
        processEpoch: this.processEpoch,
        sessionId,
        messageId: update.messageId ?? `user-${randomUUID()}`,
        text,
      });
      return;
    }
    if (update.sessionUpdate === 'agent_message_chunk' && text) {
      this.emit({
        kind: 'assistant.delta',
        processEpoch: this.processEpoch,
        sessionId,
        messageId: update.messageId ?? `assistant-${randomUUID()}`,
        text: sanitizeAssistantDisplay(text),
      });
      return;
    }
    if (update.sessionUpdate === 'config_option_update' && 'configOptions' in update) {
      this.emitSessionContext(sessionId, { configOptions: update.configOptions });
      return;
    }
    if (update.sessionUpdate === 'current_mode_update' && 'currentModeId' in update) {
      this.emit({
        kind: 'session.context',
        processEpoch: this.processEpoch,
        sessionId,
        context: { currentModeId: String(update.currentModeId) },
      });
      return;
    }
    if (update.sessionUpdate === 'available_commands_update') {
      const availableCommands = parseAvailableCommands(update);
      if (availableCommands) {
        this.emit({
          kind: 'session.context',
          processEpoch: this.processEpoch,
          sessionId,
          context: { availableCommands },
        });
      }
      return;
    }
    if (update.sessionUpdate === 'usage_update' && 'used' in update && 'size' in update) {
      const payload = update as { used: number; size: number; cost?: { amount: number; currency: string } | null };
      this.emit({
        kind: 'session.context',
        processEpoch: this.processEpoch,
        sessionId,
        context: mapUsageUpdateToContext(payload.used, payload.size, payload.cost),
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
