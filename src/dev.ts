import { createServer } from 'vite';
import { resolve } from 'node:path';
import process from 'node:process';
import { startRuntimeService } from './service/runtime.js';

function readCwd() {
  const index = process.argv.indexOf('--cwd');
  if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: npm run dev:product -- --cwd C:\\absolute\\workspace');
  return resolve(process.argv[index + 1]);
}

const workspaceDir = readCwd();
const runtime = await startRuntimeService(workspaceDir, 5194);
const vite = await createServer({
  root: resolve('app'),
  server: {
    host: '127.0.0.1',
    port: 5193,
    strictPort: true,
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:5194', ws: true },
      '/health': { target: 'http://127.0.0.1:5194' },
    },
  },
});
await vite.listen();
console.log(`Talos product: http://127.0.0.1:5193/`);
console.log(`Workspace cwd: ${workspaceDir}`);
console.log(`MiniMax ACP: ${runtime.initialized.agentInfo?.version ?? 'unknown'}`);

const shutdown = async () => {
  await vite.close();
  await runtime.close();
};
process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
