import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ServiceAction } from '../core/types.js';
import { TalosService } from './talos-service.js';

const STATIC_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStaticFile(staticRoot: string, requestPath: string, response: import('node:http').ServerResponse) {
  const decoded = decodeURIComponent(requestPath.split('?')[0] ?? '/');
  const rel = decoded === '/' ? '/index.html' : decoded;
  const file = path.resolve(staticRoot, `.${rel}`);
  if (!file.startsWith(path.resolve(staticRoot)) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  const ext = path.extname(file).toLowerCase();
  response.writeHead(200, { 'content-type': STATIC_MIME[ext] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}

export function createTalosWebSocketServer(
  service: TalosService,
  port = 5193,
  options?: { staticRoot?: string },
) {
  const staticRoot = options?.staticRoot ? path.resolve(options.staticRoot) : undefined;
  const httpServer = createServer((request, response) => {
    const url = request.url?.split('?')[0] ?? '';
    if (url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }));
      return;
    }
    if (staticRoot && request.method === 'GET') {
      serveStaticFile(staticRoot, url, response);
      return;
    }
    response.writeHead(404).end();
  });
  const websocketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
  websocketServer.on('connection', (socket: WebSocket) => {
    const stop = service.observe((snapshot) => socket.send(JSON.stringify({ type: 'snapshot', snapshot })));
    socket.on('message', async (payload) => {
      let action: ServiceAction | undefined;
      try {
        action = JSON.parse(payload.toString()) as ServiceAction;
        const result = await service.dispatch(action);
        socket.send(JSON.stringify({ type: 'action_result', operationId: action.operationId, result }));
      } catch (error) {
        socket.send(
          JSON.stringify({
            type: 'action_error',
            ...(action?.operationId ? { operationId: action.operationId } : {}),
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    });
    socket.on('close', stop);
  });
  const portInUseMessage = () =>
    `Port ${port} is already in use. Run: npm run stop:product — or netstat -ano | findstr :${port} then taskkill /PID <pid> /F`;

  const ready = new Promise<number>((resolve, reject) => {
    let settled = false;
    const fail = (error: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      if (error.code === 'EADDRINUSE') reject(new Error(portInUseMessage()));
      else reject(error);
    };
    httpServer.once('listening', () => {
      if (settled) return;
      settled = true;
      const address = httpServer.address();
      resolve(typeof address === 'object' && address ? address.port : port);
    });
    httpServer.once('error', fail);
    websocketServer.once('error', fail);
    httpServer.listen(port, '127.0.0.1');
  });
  return {
    httpServer,
    websocketServer,
    ready,
    close: () =>
      new Promise<void>((resolve) => {
        for (const client of websocketServer.clients) client.terminate();
        websocketServer.close(() => {
          httpServer.closeAllConnections();
          (httpServer as Server).close(() => resolve());
        });
      }),
  };
}
