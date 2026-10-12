import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Serve demo/talos.css and demo/fonts for the product shell (Vite root is app/). */
export function talosDemoAssetsPlugin(repoRoot: string): Plugin {
  const demoDir = path.join(repoRoot, 'demo');
  const mime: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.woff2': 'font/woff2',
    '.js': 'text/javascript; charset=utf-8',
  };

  return {
    name: 'talos-demo-assets',
    closeBundle() {
      const outDemo = path.join(repoRoot, 'app', 'dist', 'demo');
      fs.mkdirSync(path.join(outDemo, 'fonts'), { recursive: true });
      for (const file of ['talos.css', 'text-scale.js']) fs.copyFileSync(path.join(demoDir,file), path.join(outDemo,file));
      for (const file of ['HarmonyOS_Sans_SC_Regular.woff2','HarmonyOS_Sans_SC_Bold.woff2']) {
        fs.copyFileSync(path.join(demoDir,'fonts',file),path.join(outDemo,'fonts',file));
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url?.split('?')[0] ?? '';
        if (raw !== '/demo/talos.css' && raw !== '/demo/text-scale.js' && !raw.startsWith('/demo/fonts/')) {
          next();
          return;
        }
        const rel = raw.replace(/^\/demo\//, '');
        const file = path.resolve(demoDir, rel);
        if (!file.startsWith(demoDir) || !fs.existsSync(file)) {
          next();
          return;
        }
        res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}
