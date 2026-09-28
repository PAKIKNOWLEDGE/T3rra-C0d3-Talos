import { Readable, Writable } from 'node:stream';
import { spawn as spawnProcess } from 'node:child_process';
import process from 'node:process';
import * as acp from '@agentclientprotocol/sdk';
import { inspectEnvironment } from '../src/host/environment.js';

const report = inspectEnvironment();
console.log(JSON.stringify({ phase: 'environment', report }, null, 2));
if (!report.ok || !report.cli.entry) {
  console.error('NOT_READY: environment must pass before ACP initialize.');
  process.exitCode = 1;
} else {
  const child = spawnProcess(process.execPath, [report.cli.entry, 'acp'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const stderr: string[] = [];
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => stderr.push(chunk));
  const input = child.stdout as Readable;
  const output = child.stdin as Writable;
  const stream = acp.ndJsonStream(
    Writable.toWeb(output) as WritableStream<Uint8Array>,
    Readable.toWeb(input) as ReadableStream<Uint8Array>,
  );
  const client = acp.client({ name: 'talos-spike' });
  const connection = client.connect(stream);
  try {
    const initialized = await connection.agent.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      clientCapabilities: {},
      clientInfo: { name: 'talos-spike', version: '0.1.0' },
    });
    console.log(
      JSON.stringify(
        {
          phase: 'initialize',
          protocolVersion: initialized.protocolVersion,
          agentCapabilities: initialized.agentCapabilities,
          agentInfo: initialized.agentInfo,
          authMethods: initialized.authMethods ?? [],
          stderr: stderr.join('').trim(),
        },
        null,
        2,
      ),
    );
    connection.close();
    child.kill();
  } catch (error) {
    console.error(
      JSON.stringify(
        { phase: 'initialize', error: error instanceof Error ? error.message : String(error), stderr: stderr.join('') },
        null,
        2,
      ),
    );
    connection.close(error);
    child.kill();
    process.exitCode = 1;
  }
}
