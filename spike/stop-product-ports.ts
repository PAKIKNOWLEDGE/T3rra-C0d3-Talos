/**
 * Free 127.0.0.1:5193 (Vite) and :5194 (observation WS) after a stuck dev:product.
 * Windows: parses `netstat -ano`. Other platforms: best-effort lsof if present.
 */
import { execSync } from 'node:child_process';
import process from 'node:process';

const PORTS = [5193, 5194];

function pidsOnPortWindows(port: number): number[] {
  let out = '';
  try {
    out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {
    return [];
  }
  const pids = new Set<number>();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts.at(-1));
    if (Number.isFinite(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function killWindows(pids: number[]) {
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      console.log(`Stopped PID ${pid}`);
    } catch {
      console.warn(`Could not stop PID ${pid}`);
    }
  }
}

function main() {
  if (process.platform !== 'win32') {
    console.error('stop:product is tuned for Windows; use: lsof -ti :5193,:5194 | xargs kill');
    process.exit(1);
  }
  const pids = new Set<number>();
  for (const port of PORTS) {
    for (const pid of pidsOnPortWindows(port)) pids.add(pid);
  }
  if (pids.size === 0) {
    console.log(`Ports ${PORTS.join(', ')} are free.`);
    return;
  }
  killWindows([...pids]);
}

main();
