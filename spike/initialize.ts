import { Readable } from 'node:stream';
import { spawn as spawnProcess } from 'node:child_process';
import process from 'node:process';
import { inspectEnvironment } from '../src/host/environment.js';
import { StudioJsonRpcClient } from '../src/adapter/studio-jsonrpc.js';

const report = inspectEnvironment();
console.log(JSON.stringify({ phase: 'environment', report }, null, 2));
if (!report.ok || !report.cli.entry) {
  console.error('NOT_READY: environment must pass before studio initialize.');
  process.exitCode = 1;
} else {
  const cwd = process.cwd();
  const child = spawnProcess(process.execPath, [report.cli.entry, 'studio'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd,
    windowsHide: true,
  });
  const stderr: string[] = [];
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => stderr.push(chunk));
  const rpc = new StudioJsonRpcClient(
    (line) => {
      child.stdin.write(line);
    },
    () => {},
  );
  (child.stdout as Readable).setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => rpc.feed(chunk));
  void rpc
    .request('studio/initialize', { cwd })
    .then((initialized) => {
      console.log(
        JSON.stringify(
          {
            phase: 'initialize',
            initialized,
            stderr: stderr.join('').trim(),
          },
          null,
          2,
        ),
      );
      rpc.close();
      child.kill();
    })
    .catch((error) => {
      console.error(
        JSON.stringify(
          {
            phase: 'initialize',
            error: error instanceof Error ? error.message : String(error),
            stderr: stderr.join(''),
          },
          null,
          2,
        ),
      );
      rpc.close();
      child.kill();
      process.exitCode = 1;
    });
}
