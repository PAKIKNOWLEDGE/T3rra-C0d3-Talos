import { build } from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist-desktop');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

execSync('vite build --config app/vite.config.ts', { cwd: root, stdio: 'inherit', env: process.env });

await build({
  entryPoints: [resolve(root, 'src/desktop-service-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: resolve(out, 'talos-desktop-service.mjs'),
  format: 'esm',
  logLevel: 'info',
});

cpSync(resolve(root, 'app/dist'), resolve(out, 'static'), { recursive: true });

const binDir = resolve(root, 'src-tauri/binaries');
mkdirSync(binDir, { recursive: true });
const nodeTarget = resolve(binDir, 'node-x86_64-pc-windows-msvc.exe');
copyFileSync(process.execPath, nodeTarget);
console.log(`Staged Node runtime: ${nodeTarget}`);
