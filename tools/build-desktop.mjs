import { build } from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist-desktop');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

execSync('vite build --config app/vite.config.ts', { cwd: root, stdio: 'inherit', env: process.env });

await build({
  entryPoints: [resolve(root, 'src/desktop-service-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node24',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  outfile: resolve(out, 'talos-desktop-service.mjs'),
  format: 'esm',
  logLevel: 'info',
});

cpSync(resolve(root, 'app/dist'), resolve(out, 'static'), { recursive: true });

const binDir = resolve(root, 'src-tauri/binaries');
mkdirSync(binDir, { recursive: true });
if (process.platform !== 'win32' || process.arch !== 'x64' || process.version !== 'v24.15.0') {
  throw new Error('Windows package requires pinned Node v24.15.0 x64; do not silently bundle a different runtime.');
}
const nodeTarget = resolve(binDir, 'node-x86_64-pc-windows-msvc.exe');
copyFileSync(process.execPath, nodeTarget);
const nodeBytes = readFileSync(nodeTarget);
const locked = JSON.parse(readFileSync(resolve(root, 'tools/runtime/node-win-x64.json'), 'utf8'));
if (createHash('sha256').update(nodeBytes).digest('hex') !== locked.sha256) throw new Error('Node runtime checksum does not match pinned official binary');
copyFileSync(resolve(root, 'tools/runtime/NODE-LICENSE.txt'), resolve(out, 'NODE-LICENSE.txt'));
writeFileSync(resolve(out, 'node-runtime.json'), JSON.stringify({ version: process.version, architecture: process.arch, source: 'https://nodejs.org/dist/v24.15.0/win-x64/node.exe', sha256: createHash('sha256').update(nodeBytes).digest('hex') }, null, 2));
console.log(`Staged pinned Node runtime: ${nodeTarget}`);
