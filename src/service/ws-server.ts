import { createServer, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ServiceAction } from '../core/types.js';
import { TalosService } from './talos-service.js';

export function createTalosWebSocketServer(service: TalosService, port = 5193) {
  const httpServer = createServer((request, response) => {
    if (request.url !== '/health') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }));
  });
  const websocketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
  websocketServer.on('connection', (socket: WebSocket) => {
    const stop = service.observe((snapshot) => socket.send(JSON.stringify({ type: 'snapshot', snapshot })));
    socket.on('message', async (payload) => {
      try {
        const action = JSON.parse(payload.toString()) as ServiceAction;
        const result = await service.dispatch(action);
        socket.send(JSON.stringify({ type: 'action_result', operationId: action.operationId, result }));
      } catch (error) {
        socket.send(JSON.stringify({ type: 'action_error', message: error instanceof Error ? error.message : String(error) }));
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
