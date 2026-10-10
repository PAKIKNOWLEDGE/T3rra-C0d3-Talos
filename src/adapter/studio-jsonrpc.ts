export type StudioJsonRpcId = string | number;

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export type StudioNotificationHandler = (method: string, params: unknown) => void;

export class StudioJsonRpcClient {
  private nextId = 1;
  private readonly pending = new Map<StudioJsonRpcId, Pending>();
  private buffer = '';

  constructor(
    private readonly writeLine: (line: string) => void,
    private readonly onNotification: StudioNotificationHandler,
  ) {}

  feed(chunk: string) {
    this.buffer += chunk;
    for (;;) {
      const newline = this.buffer.indexOf('\n');
      if (newline < 0) break;
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      this.handleLine(line);
    }
  }

  request(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    this.writeLine(`${payload}\n`);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close(error?: Error) {
    for (const pending of this.pending.values()) {
      pending.reject(error ?? new Error('Studio JSON-RPC connection closed.'));
    }
    this.pending.clear();
  }

  private handleLine(line: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;
    const message = parsed as {
      id?: StudioJsonRpcId;
      method?: string;
      params?: unknown;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.method) {
      this.onNotification(message.method, message.params);
      return;
    }
    if (message.id === undefined) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message ?? 'Studio JSON-RPC error.'));
      return;
    }
    pending.resolve(message.result);
  }
}
