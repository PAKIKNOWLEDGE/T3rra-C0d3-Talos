import { Readable, Writable } from 'node:stream';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import * as acp from '@agentclientprotocol/sdk';
import { inspectEnvironment } from '../src/host/environment.js';

const apiFormats = new Set(['anthropic-messages', 'openai-completions', 'openai-responses']);

function required(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function runMcode(entry: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [entry, ...args], {
    env,
    encoding: 'utf8',
    windowsHide: true,
  });
}

function textFromUpdate(update: acp.SessionUpdate): string | undefined {
  if ('content' in update && update.content && !Array.isArray(update.content) && update.content.type === 'text') {
    return update.content.text;
  }
  return undefined;
}

const environment = inspectEnvironment();
const baseUrl = required('TALOS_PROVIDER_BASE_URL');
const modelId = required('TALOS_PROVIDER_MODEL');
const apiKeyEnv = required('TALOS_PROVIDER_API_KEY_ENV');
const apiFormat = required('TALOS_PROVIDER_API_FORMAT') ?? 'openai-completions';
const providerName = required('TALOS_PROVIDER_NAME') ?? 'Talos custom provider';
const failures = [...environment.failures];
if (!baseUrl) failures.push('Set TALOS_PROVIDER_BASE_URL before running the real provider probe.');
if (!modelId) failures.push('Set TALOS_PROVIDER_MODEL before running the real provider probe.');
if (!apiKeyEnv) failures.push('Set TALOS_PROVIDER_API_KEY_ENV; the probe never accepts a raw key argument.');
if (!apiKeyEnv || !process.env[apiKeyEnv]?.trim()) {
  failures.push(`The configured provider key environment variable is missing: ${apiKeyEnv ?? 'unknown'}.`);
}
if (!apiFormats.has(apiFormat)) failures.push(`Unsupported TALOS_PROVIDER_API_FORMAT: ${apiFormat}.`);
if (!environment.cli.entry) failures.push('mcode CLI entry was not resolved.');

if (failures.length > 0) {
  console.log(JSON.stringify({ phase: 'preflight', ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  const probeRoot = mkdtempSync(join(tmpdir(), 'talos-custom-provider-'));
  const dataDir = join(probeRoot, 'data');
  const cwd = join(probeRoot, 'workspace');
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(cwd, { recursive: true });
  const keepData = process.env.TALOS_KEEP_PROBE_DATA === '1';
  const childEnv = {
    ...process.env,
    MINIMAX_DATA_DIR: dataDir,
    TALOS_NEUTRAL_RUNTIME: '1',
  };

  try {
    console.log(
      JSON.stringify(
        {
          phase: 'preflight',
          ok: true,
          node: environment.node,
          cli: environment.cli,
          provider: { name: providerName, apiFormat, modelId, baseUrl: new URL(baseUrl!).origin },
          isolatedDataDir: dataDir,
        },
        null,
        2,
      ),
    );

    const add = runMcode(
      environment.cli.entry!,
      [
        'provider',
        'add',
        '--name',
        providerName,
        '--base-url',
        baseUrl!,
        '--api-format',
        apiFormat,
        '--model',
        modelId!,
        '--api-key-env',
        apiKeyEnv!,
        '--use',
      ],
      childEnv,
    );
    if (add.status !== 0) {
      throw new Error(`provider add --use failed: ${(add.stderr || add.stdout || '').trim()}`);
    }
    console.log(JSON.stringify({ phase: 'provider', result: 'added-and-selected' }, null, 2));

    const listed = runMcode(environment.cli.entry!, ['provider', 'list', '--json'], childEnv);
    if (listed.status !== 0) throw new Error(`provider list failed: ${(listed.stderr || listed.stdout || '').trim()}`);
    const snapshot = JSON.parse(listed.stdout) as {
      providers?: Array<{ providerId?: string; active?: boolean; models?: Array<{ modelId?: string }> }>;
    };
    const selected = snapshot.providers?.find(
      (provider) => provider.active && provider.providerId?.startsWith('custom_provider:'),
    );
    if (!selected?.providerId) throw new Error('provider list did not report an active custom provider.');
    console.log(
      JSON.stringify(
        {
          phase: 'provider',
          providerId: selected.providerId,
          activeModel: selected.models?.find((model) => model.modelId === modelId)?.modelId ?? modelId,
        },
        null,
        2,
      ),
    );

    const child = spawn(process.execPath, [environment.cli.entry!, 'acp'], {
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stderr: string[] = [];
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => stderr.push(chunk));
    const updates: Array<{ kind: string; text?: string }> = [];
    const client = acp.client({ name: 'talos-custom-provider-probe' }).onNotification(
      acp.methods.client.session.update,
      ({ params }) => {
        const text = textFromUpdate(params.update);
        updates.push({ kind: params.update.sessionUpdate, ...(text ? { text } : {}) });
      },
    );
    const stream = acp.ndJsonStream(
      Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
      Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
    );
    const connection = client.connect(stream);
    const initialized = await connection.agent.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: { name: 'talos-custom-provider-probe', version: '0.1.0' },
    });
    const session = await connection.agent.request(acp.methods.agent.session.new, { cwd, mcpServers: [] });
    const prompt = 'Only reply with the exact text talos-custom-ok. Do not call tools.';
    const result = await connection.agent.request(acp.methods.agent.session.prompt, {
      sessionId: session.sessionId,
      prompt: [{ type: 'text', text: prompt }],
    });
    console.log(
      JSON.stringify(
        {
          phase: 'conversation',
          protocolVersion: initialized.protocolVersion,
          agentInfo: initialized.agentInfo,
          sessionId: session.sessionId,
          stopReason: result.stopReason,
          updateCounts: updates.reduce<Record<string, number>>((counts, update) => {
            counts[update.kind] = (counts[update.kind] ?? 0) + 1;
            return counts;
          }, {}),
          textHead: updates
            .filter((update) => update.kind === 'agent_message_chunk')
            .map((update) => update.text ?? '')
            .join('')
            .slice(0, 240),
          stderr: stderr.join('').trim(),
        },
        null,
        2,
      ),
    );
    connection.close();
    if (!child.killed) child.kill();
  } catch (error) {
    console.error(
      JSON.stringify(
        { phase: 'error', message: error instanceof Error ? error.message : String(error) },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    if (!keepData && existsSync(probeRoot)) rmSync(probeRoot, { recursive: true, force: true });
  }
}
