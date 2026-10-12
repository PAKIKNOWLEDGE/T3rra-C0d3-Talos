import { Readable } from 'node:stream';
import { spawn as spawnProcess, type ChildProcessWithoutNullStreams } from 'node:child_process';
import process from 'node:process';
import { TalosStudioAdapter } from '../adapter/talos-studio.js';
import { StudioJsonRpcClient } from '../adapter/studio-jsonrpc.js';
import type { EngineEvent } from '../core/types.js';
import { inspectEnvironment } from './environment.js';

export async function startTalosStudioProcess(
  processEpoch: number,
  workspaceCwd: string,
  emit: (event: EngineEvent) => void,
) {
  const environment = inspectEnvironment();
  if (!environment.ok || !environment.cli.entry) {
    throw new Error(`Environment is not ready: ${environment.failures.join('; ')}`);
  }
  const child = spawnProcess(process.execPath, [environment.cli.entry, 'studio'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: workspaceCwd,
    windowsHide: true,
  }) as ChildProcessWithoutNullStreams;
  const stderr: string[] = [];
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => stderr.push(chunk));

  let adapter: TalosStudioAdapter | undefined;
  const rpc = new StudioJsonRpcClient(
    (line) => {
      child.stdin.write(line);
    },
    (method, params) => {
      adapter?.handleNotification(method, params);
    },
  );
  (child.stdout as Readable).setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => rpc.feed(chunk));

  adapter = TalosStudioAdapter.attach(rpc, processEpoch, emit);
  let initialized;
  try { initialized = await adapter.initialize(workspaceCwd); }
  catch (error) {
    adapter.close(error);
    rpc.close();
    if (!child.killed) child.kill();
    throw error;
  }

  return {
    initialized,
    adapter,
    stderr,
    close: () => {
      adapter?.close();
      rpc.close();
      if (!child.killed) child.kill();
    },
  };
}

/** @deprecated Use startTalosStudioProcess */
export const startTalosAcpProcess = startTalosStudioProcess;
