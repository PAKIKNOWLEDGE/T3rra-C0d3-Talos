import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'vite';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(repoRoot, 'app');

describe('markdown vite import chain (r2-a)', () => {
  it('resolves index.html → talos.js → message-markdown.ts', async () => {
    const server = await createServer({
      configFile: path.join(appDir, 'vite.config.ts'),
      root: appDir,
      logLevel: 'error',
    });
    try {
      const talosPath = path.join(appDir, 'talos.js');
      const resolved = await server.pluginContainer.resolveId(
        '../src/view/message-markdown.ts',
        talosPath,
      );
      expect(resolved?.id ?? '').toContain('message-markdown');
      const markdownBundle = await server.transformRequest(resolved!.id);
      expect(markdownBundle?.code).toContain('renderAssistantMessageHtml');
      const talosBundle = await server.transformRequest('/talos.js');
      expect(talosBundle?.code).toContain('message-markdown');
    } finally {
      await server.close();
    }
  });
});
