import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { resolve } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ServiceAction } from '../core/types.js';
import { TalosService } from './talos-service.js';

export function createTalosWebSocketServer(service: TalosService, port = 5193) {
  const httpServer = createServer(async (request, response) => {
    if (request.method === 'POST' && request.url === '/provider-probe') {
      try {
        const input = await readJsonBody(request);
        const result = await runProviderProbe(input);
        response.writeHead(result.ok ? 200 : 502, { 'content-type': 'application/json' });
        response.end(JSON.stringify(result));
      } catch (error) {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }
    if (request.url !== '/health') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }));
  });
  const websocketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
  websocketServer.on('connection', (socket: WebSocket) => {
    const stop = service.observe((snapshot) => socket.send(JSON.stringify({ type: 'snapshot', snapshot })));
    socket.on('message', async (payload) => {
      try {
        const action = JSON.parse(payload.toString()) as ServiceAction;
        const result = await service.dispatch(action);
        socket.send(JSON.stringify({ type: 'action_result', operationId: action.operationId, result }));
      } catch (error) {
        socket.send(JSON.stringify({ type: 'action_error', message: error instanceof Error ? error.message : String(error) }));
      }
    });
    socket.on('close', stop);
  });
  httpServer.listen(port, '127.0.0.1');
  const ready = new Promise<number>((resolve) => {
    httpServer.once('listening', () => {
      const address = httpServer.address();
      resolve(typeof address === 'object' && address ? address.port : port);
    });
  });
  return {
    httpServer,
    websocketServer,
    ready,
    close: () => new Promise<void>((resolve) => websocketServer.close(() => (httpServer as Server).close(() => resolve()))),
  };
}

type ProviderProbeInput = {
  name?: unknown;
  baseUrl?: unknown;
  model?: unknown;
  apiFormat?: unknown;
  apiKey?: unknown;
};

const PROVIDER_FORMATS = new Set(['anthropic-messages', 'openai-completions', 'openai-responses']);

async function readJsonBody(request: IncomingMessage): Promise<ProviderProbeInput> {
  const contentLength = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 64_000) throw new Error('请求内容过大。');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64_000) throw new Error('请求内容过大。');
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as ProviderProbeInput;
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('请求格式无效。');
  return parsed;
}

function stringField(input: ProviderProbeInput, field: keyof ProviderProbeInput, label: string): string {
  const value = input[field];
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label}不能为空。`);
  return value.trim();
}

async function runProviderProbe(input: ProviderProbeInput) {
  const name = stringField(input, 'name', 'Provider 名称');
  const baseUrl = stringField(input, 'baseUrl', 'Base URL');
  const model = stringField(input, 'model', '模型名');
  const apiKey = stringField(input, 'apiKey', 'API key');
  const apiFormat = typeof input.apiFormat === 'string' && input.apiFormat.trim() ? input.apiFormat.trim() : 'openai-completions';
  if (!PROVIDER_FORMATS.has(apiFormat)) throw new Error('API 格式不受支持。');
  try {
    new URL(baseUrl);
  } catch {
    throw new Error('Base URL 不是有效地址。');
  }

  const tsx = resolve('node_modules/tsx/dist/cli.mjs');
  const probe = resolve('spike/custom-provider-probe.ts');
  const child = spawn(process.execPath, [tsx, probe], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TALOS_PROVIDER_NAME: name,
      TALOS_PROVIDER_BASE_URL: baseUrl,
      TALOS_PROVIDER_MODEL: model,
      TALOS_PROVIDER_API_FORMAT: apiFormat,
      TALOS_PROVIDER_API_KEY_ENV: 'TALOS_PROBE_API_KEY',
      TALOS_PROBE_API_KEY: apiKey,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const stdout: string[] = [];
  const stderr: string[] = [];
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => stdout.push(chunk));
  child.stderr.on('data', (chunk: string) => stderr.push(chunk));
  const exitCode = await new Promise<number>((resolveExit) => {
    const timer = setTimeout(() => child.kill(), 120_000);
    child.once('close', (code) => {
      clearTimeout(timer);
      resolveExit(code ?? 1);
    });
  });
  const trace = `${stdout.join('')}\n${stderr.join('')}`.replaceAll(apiKey, '[redacted]');
  const ok =
    exitCode === 0 &&
    trace.includes('"phase": "conversation"') &&
    trace.includes('"stopReason": "end_turn"') &&
    trace.includes('talos-custom-ok');
  return {
    ok,
    phase: ok ? 'conversation' : 'provider',
    message: ok ? '连接成功，模型已返回 talos-custom-ok。' : '连接未通过，请检查地址、模型名和密钥。',
    trace: trace.trim().slice(-12_000),
  };
}
