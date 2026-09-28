import { Readable, Writable } from 'node:stream';
import { spawn as spawnProcess, type ChildProcessWithoutNullStreams } from 'node:child_process';
import process from 'node:process';
import * as acp from '@agentclientprotocol/sdk';
import { MinimaxAcpAdapter } from '../adapter/minimax-acp.js';
import type { EngineEvent } from '../core/types.js';
import { inspectEnvironment } from './environment.js';

export async function startMinimaxProcess(processEpoch: number, emit: (event: EngineEvent) => void) {
  const environment = inspectEnvironment();
  if (!environment.ok || !environment.cli.entry) {
    throw new Error(`Environment is not ready: ${environment.failures.join('; ')}`);
  }
  const child = spawnProcess(process.execPath, [environment.cli.entry, 'acp'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  }) as ChildProcessWithoutNullStreams;
  const stderr: string[] = [];
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => stderr.push(chunk));
  const client = acp.client({ name: 'talos-service' });
  const stream = acp.ndJsonStream(
    Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
    Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
  );
  const connection = client.connect(stream);
  const initialized = await connection.agent.request(acp.methods.agent.initialize, {
    protocolVersion: acp.PROTOCOL_VERSION,
    clientCapabilities: {},
    clientInfo: { name: 'talos-service', version: '0.1.0' },
  });
  const adapter = new MinimaxAcpAdapter(client, connection, processEpoch, emit);
  return {
    initialized,
    adapter,
    stderr,
    close: () => {
      adapter.close();
      if (!child.killed) child.kill();
    },
  };
}
