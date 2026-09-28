import { Readable, Writable } from 'node:stream';
import { spawn as spawnProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import * as acp from '@agentclientprotocol/sdk';
import { inspectEnvironment } from '../src/host/environment.js';

type ApprovalMode = 'deny' | 'allow-once';
type ProbeUpdate = {
  sessionUpdate: string;
  text?: string;
  messageId?: string;
  toolCallId?: string;
  status?: string;
  locations?: string[];
};

const root = resolve(process.cwd());
const probeRoot = join(root, '.talos', `round2-${Date.now()}`);
mkdirSync(probeRoot, { recursive: true });

function waitFor<T>(predicate: () => T | undefined, timeoutMs = 30_000): Promise<T> {
  const start = Date.now();
  return new Promise((resolvePromise, reject) => {
    const poll = () => {
      const value = predicate();
      if (value !== undefined) {
        resolvePromise(value);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Timed out after ${timeoutMs}ms.`));
        return;
      }
      setTimeout(poll, 25);
    };
    poll();
  });
}

function textFromUpdate(update: acp.SessionUpdate): string | undefined {
  if (
    'content' in update &&
    update.content &&
    !Array.isArray(update.content) &&
    update.content.type === 'text'
  ) {
    return update.content.text;
  }
  return undefined;
}

function summarizeUpdate(notification: acp.SessionNotification): ProbeUpdate {
  const update = notification.update;
  const summary: ProbeUpdate = {
    sessionUpdate: update.sessionUpdate,
    ...(textFromUpdate(update) ? { text: textFromUpdate(update)?.slice(0, 240) } : {}),
  };
  if ('messageId' in update && update.messageId) summary.messageId = update.messageId;
  if ('toolCallId' in update && update.toolCallId) summary.toolCallId = update.toolCallId;
  if ('status' in update && update.status) summary.status = update.status;
  if ('locations' in update && update.locations) {
    summary.locations = update.locations.map((location) => location.path);
  }
  return summary;
}

function compactUpdates(updates: ProbeUpdate[]) {
  const counts: Record<string, number> = {};
  const messageIds = new Set<string>();
  const toolCallIds = new Set<string>();
  const locations = new Set<string>();
  const textByMessage = new Map<string, string>();
  const sequence: Array<{ kind: string; text: string }> = [];
  for (const update of updates) {
    counts[update.sessionUpdate] = (counts[update.sessionUpdate] ?? 0) + 1;
    if (update.messageId) {
      messageIds.add(update.messageId);
      if (update.text) textByMessage.set(update.messageId, `${textByMessage.get(update.messageId) ?? ''}${update.text}`);
    }
    if (update.toolCallId) toolCallIds.add(update.toolCallId);
    for (const location of update.locations ?? []) locations.add(location);
    if ((update.sessionUpdate === 'user_message_chunk' || update.sessionUpdate === 'agent_message_chunk') && update.text) {
      sequence.push({ kind: update.sessionUpdate, text: update.text.slice(0, 180) });
    }
  }
  return {
    counts,
    messageIds: [...messageIds],
    toolCallIds: [...toolCallIds],
    locations: [...locations],
    messageText: [...textByMessage.entries()].map(([messageId, text]) => ({
      messageId,
      textHead: text.slice(0, 180),
      textTail: text.slice(-180),
    })),
    sequence: sequence.slice(0, 12),
  };
}

async function startAgent(approvalMode?: ApprovalMode) {
  const environment = inspectEnvironment();
  if (!environment.ok || !environment.cli.entry) {
    throw new Error(`Environment is not ready: ${environment.failures.join('; ')}`);
  }
  const child = spawnProcess(process.execPath, [environment.cli.entry, 'acp'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const stderr: string[] = [];
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => stderr.push(chunk));
  const updates: ProbeUpdate[] = [];
  const permissionRequests: Array<{
    sessionId: string;
    toolCallId: string;
    options: Array<{ optionId: string; name: string; kind: string }>;
    selectedOptionId?: string;
  }> = [];
  const client = acp
    .client({ name: 'talos-round2-probe' })
    .onNotification(acp.methods.client.session.update, ({ params }) => {
      updates.push(summarizeUpdate(params));
    })
    .onRequest(acp.methods.client.session.requestPermission, ({ params }) => {
      const options = params.options.map((option) => ({
        optionId: option.optionId,
        name: option.name,
        kind: option.kind,
      }));
      const selected =
        approvalMode === 'allow-once'
          ? options.find((option) => option.kind === 'allow_once')
          : options.find((option) => option.kind === 'reject_once') ?? options.at(-1);
      permissionRequests.push({
        sessionId: params.sessionId,
        toolCallId: params.toolCall.toolCallId,
        options,
        ...(selected ? { selectedOptionId: selected.optionId } : {}),
      });
      if (!selected) return { outcome: { outcome: 'cancelled' as const } };
      return { outcome: { outcome: 'selected' as const, optionId: selected.optionId } };
    });
  const input = child.stdout as Readable;
  const output = child.stdin as Writable;
  const stream = acp.ndJsonStream(
    Writable.toWeb(output) as WritableStream<Uint8Array>,
    Readable.toWeb(input) as ReadableStream<Uint8Array>,
  );
  const connection = client.connect(stream);
  const initialized = await connection.agent.request(acp.methods.agent.initialize, {
    protocolVersion: acp.PROTOCOL_VERSION,
    clientCapabilities: {},
    clientInfo: { name: 'talos-round2-probe', version: '0.1.0' },
  });
  return { child, connection, initialized, updates, permissionRequests, stderr };
}

async function stopAgent(agent: Awaited<ReturnType<typeof startAgent>>) {
  agent.connection.close();
  if (!agent.child.killed) agent.child.kill();
  await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 100));
}

async function runConversationProbe(cwd: string) {
  const agent = await startAgent();
  const session = await agent.connection.agent.request(acp.methods.agent.session.new, {
    cwd,
    mcpServers: [],
  });
  const normalPrompt = 'Only reply with the exact text talos-ok. Do not call tools.';
  const normalResult = await agent.connection.agent.request(acp.methods.agent.session.prompt, {
    sessionId: session.sessionId,
    prompt: [{ type: 'text', text: normalPrompt }],
  });
  const normalUpdates = agent.updates.splice(0);

  const cancelPrompt = agent.connection.agent.request(acp.methods.agent.session.prompt, {
    sessionId: session.sessionId,
    prompt: [
      {
        type: 'text',
        text: 'Write a very long numbered response from 1 to 500, one number per line, and do not stop early.',
      },
    ],
  });
  await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 700));
  await agent.connection.agent.notify(acp.methods.agent.session.cancel, {
    sessionId: session.sessionId,
  });
  const cancelResult = await cancelPrompt;
  const cancelUpdates = agent.updates.splice(0);
  const trace = {
    cwd,
    sessionId: session.sessionId,
    normal: {
      prompt: normalPrompt,
      stopReason: normalResult.stopReason,
      updates: compactUpdates(normalUpdates),
    },
    cancel: {
      stopReason: cancelResult.stopReason,
      updates: compactUpdates(cancelUpdates),
    },
    stderr: agent.stderr.join('').trim(),
    initialized: {
      protocolVersion: agent.initialized.protocolVersion,
      agentInfo: agent.initialized.agentInfo,
      agentCapabilities: agent.initialized.agentCapabilities,
    },
  };
  await stopAgent(agent);
  return trace;
}

async function runLoadProbe(cwd: string, sessionId: string) {
  const agent = await startAgent();
  const loadResult = await agent.connection.agent.request(acp.methods.agent.session.load, {
    sessionId,
    cwd,
    mcpServers: [],
  });
  const replayUpdates = agent.updates.splice(0);
  const promptResult = await agent.connection.agent.request(acp.methods.agent.session.prompt, {
    sessionId,
    prompt: [{ type: 'text', text: 'Only reply with the exact text talos-resumed. Do not call tools.' }],
  });
  const continuationUpdates = agent.updates.splice(0);
  await stopAgent(agent);
  return {
    cwd,
    sessionId,
    loadResponseKeys: Object.keys(loadResult ?? {}),
    replayUpdates: compactUpdates(replayUpdates),
    continuation: {
      stopReason: promptResult.stopReason,
      updates: compactUpdates(continuationUpdates),
    },
    stderr: agent.stderr.join('').trim(),
  };
}

async function runApprovalProbe(cwd: string, approvalMode: ApprovalMode) {
  const target = join(cwd, 'acceptance-note.txt');
  const agent = await startAgent(approvalMode);
  const session = await agent.connection.agent.request(acp.methods.agent.session.new, {
    cwd,
    mcpServers: [],
  });
  const promptResult = await agent.connection.agent.request(acp.methods.agent.session.prompt, {
    sessionId: session.sessionId,
    prompt: [
      {
        type: 'text',
        text: 'Create acceptance-note.txt in the current workspace. Its entire content must be exactly acceptance-ok. Do not modify any other file. Then reply with the final path.',
      },
    ],
  });
  const fileExists = existsSync(target);
  const fileContent = fileExists ? readFileSync(target, 'utf8') : undefined;
  await stopAgent(agent);
  return {
    cwd,
    sessionId: session.sessionId,
    approvalMode,
    stopReason: promptResult.stopReason,
    permissionRequests: agent.permissionRequests,
    fileExists,
    ...(fileContent !== undefined ? { fileContent } : {}),
    updates: compactUpdates(agent.updates),
    stderr: agent.stderr.join('').trim(),
  };
}

async function main() {
  console.log(JSON.stringify({ phase: 'environment', report: inspectEnvironment() }, null, 2));
  const conversationCwd = join(probeRoot, 'conversation');
  mkdirSync(conversationCwd, { recursive: true });
  const conversation = await runConversationProbe(conversationCwd);
  console.log(JSON.stringify({ phase: 'conversation', result: conversation }, null, 2));
  const load = await runLoadProbe(conversationCwd, conversation.sessionId);
  console.log(JSON.stringify({ phase: 'load', result: load }, null, 2));

  const denyCwd = join(probeRoot, 'approval-deny');
  const allowCwd = join(probeRoot, 'approval-allow-once');
  mkdirSync(denyCwd, { recursive: true });
  mkdirSync(allowCwd, { recursive: true });
  const denied = await runApprovalProbe(denyCwd, 'deny');
  console.log(JSON.stringify({ phase: 'approval-deny', result: denied }, null, 2));
  const allowed = await runApprovalProbe(allowCwd, 'allow-once');
  console.log(JSON.stringify({ phase: 'approval-allow-once', result: allowed }, null, 2));
  for (const cwd of [denyCwd, allowCwd]) {
    const file = join(cwd, 'acceptance-note.txt');
    if (existsSync(file)) rmSync(file, { force: true });
  }
  console.log(JSON.stringify({ phase: 'complete', probeRoot }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ phase: 'error', error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
