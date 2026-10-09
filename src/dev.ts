import { createServer } from 'vite';
import { resolve } from 'node:path';
import process from 'node:process';
import { startRuntimeService } from './service/runtime.js';
import { talosDemoAssetsPlugin } from './vite-demo-assets.js';
import { formatAcpAgentLabel } from './host/agent-label.js';

const repoRoot = resolve(import.meta.dirname, '..');

function readCwd() {
  const index = process.argv.indexOf('--cwd');
  if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: npm run dev:product -- --cwd C:\\absolute\\workspace');
  return resolve(process.argv[index + 1]);
}

const workspaceDir = readCwd();
let runtime: Awaited<ReturnType<typeof startRuntimeService>>;
try {
  runtime = await startRuntimeService(workspaceDir, 5194);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
const vite = await createServer({
  root: resolve('app'),
  plugins: [talosDemoAssetsPlugin(repoRoot)],
  server: {
    host: '127.0.0.1',
    port: 5193,
    strictPort: true,
    fs: { allow: [repoRoot] },
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:5194', ws: true },
      '/health': { target: 'http://127.0.0.1:5194' },
    },
  },
});
await vite.listen();
console.log(`Talos product: http://127.0.0.1:5193/`);
console.log(`Workspace cwd: ${workspaceDir}`);
console.log(`Talos ACP agent: ${formatAcpAgentLabel(runtime.initialized.agentInfo)}`);

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nShutting down (${signal})…`);
  try {
    await runtime.close();
    await vite.close();
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
