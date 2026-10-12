import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { talosDemoAssetsPlugin } from '../src/vite-demo-assets.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  root: path.dirname(fileURLToPath(import.meta.url)),
  plugins: [talosDemoAssetsPlugin(repoRoot)],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html'),
    },
  },
  server: {
    fs: { allow: [repoRoot] },
    host: '127.0.0.1',
    port: 5193,
    strictPort: true,
  },
});
