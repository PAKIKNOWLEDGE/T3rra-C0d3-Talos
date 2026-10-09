import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { talosDemoAssetsPlugin } from '../src/vite-demo-assets.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [talosDemoAssetsPlugin(repoRoot)],
  server: {
    fs: { allow: [repoRoot] },
    host: '127.0.0.1',
    port: 5193,
    strictPort: true,
  },
});
