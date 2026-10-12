import { resolve } from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { startRuntimeService } from './service/runtime.js';

process.env.TALOS_DESKTOP_BUNDLE = '1';

function readArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) return undefined;
  return process.argv[index + 1];
}

function readPort(): number {
  const raw = readArg('port');
  if (!raw) return 0;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid --port ${raw}`);
  return parsed;
}

const staticDir = readArg('static-dir');
if (!staticDir) {
  console.error('Usage: talos-desktop-service --static-dir <path> [--port 0] [--cwd <abs>]');
  process.exit(1);
}

const staticRoot = resolve(staticDir);
const port = readPort();
const initialCwd = readArg('cwd')?.trim() ?? '';

const authToken = randomUUID();
let runtime: Awaited<ReturnType<typeof startRuntimeService>>;
try {
  runtime = await startRuntimeService(initialCwd, port, {
    allowDeferredWorkspace: true,
    staticRoot,
    authToken,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const listenPort = runtime.listenPort;
const origin = `http://127.0.0.1:${listenPort}`;
console.log(`TALOS_DESKTOP_READY ${origin}/?token=${authToken}`);
console.log(`Talos desktop service: ${origin}/`);
if (initialCwd) console.log(`Workspace cwd: ${initialCwd}`);

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Shutting down (${signal})…`);
  try {
    await runtime.close();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
};
const onSignal = (signal: string) => {
  void shutdown(signal).finally(() => process.exit(0));
};
process.once('SIGINT', () => onSignal('SIGINT'));
process.once('SIGTERM', () => onSignal('SIGTERM'));
if (process.platform === 'win32') {
  process.once('SIGBREAK', () => onSignal('SIGBREAK'));
}

const input = createInterface({ input: process.stdin });
input.on('line', line => { if (line.trim() === 'shutdown') onSignal('host-shutdown'); });
input.on('close', () => onSignal('host-closed'));
