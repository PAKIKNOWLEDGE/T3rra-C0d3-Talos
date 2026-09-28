import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const EXPECTED_MCODE_VERSION = '0.5.7';
const MIN_NODE = { major: 22, minor: 19 };

export type EnvironmentReport = {
  ok: boolean;
  node: { executable: string; version: string; supported: boolean };
  cli: {
    launcher?: string;
    entry?: string;
    version?: string;
    expectedVersion: string;
    matchesExpected: boolean;
  };
  failures: string[];
};

function parseVersion(value: string): [number, number] | undefined {
  const match = value.trim().match(/v?(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

function supportedNode(version: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  const [major, minor] = parsed;
  return (major === 22 && minor >= MIN_NODE.minor) || (major >= 24 && major < 27);
}

function findLauncher(): string | undefined {
  const explicit = process.env.TALOS_MCODE_LAUNCHER?.trim();
  if (explicit) return resolve(explicit);
  try {
    const output = execFileSync('where.exe', ['mcode'], { encoding: 'utf8' });
    return output.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  } catch {
    return undefined;
  }
}

function findEntry(launcher: string | undefined): string | undefined {
  const explicit = process.env.TALOS_MCODE_ENTRY?.trim();
  if (explicit) return resolve(explicit);
  if (!launcher) return undefined;
  const candidate = join(dirname(launcher), 'node_modules', '@minimax-ai', 'code', 'cli.js');
  return existsSync(candidate) ? candidate : undefined;
}

function readInstalledPackageVersion(entry: string | undefined): string | undefined {
  if (!entry) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(join(dirname(entry), 'package.json'), 'utf8')) as { version?: unknown };
    return typeof parsed.version === 'string' ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

function runEntryVersion(entry: string | undefined): string | undefined {
  if (!entry) return undefined;
  const result = spawnSync(process.execPath, [entry, '--version'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return undefined;
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.match(/\b\d+\.\d+\.\d+\b/)?.[0];
}

export function inspectEnvironment(): EnvironmentReport {
  const launcher = findLauncher();
  const entry = findEntry(launcher);
  const reportedVersion = runEntryVersion(entry) ?? readInstalledPackageVersion(entry);
  const nodeVersion = process.version;
  const failures: string[] = [];
  if (!supportedNode(nodeVersion)) failures.push(`Unsupported Node ${nodeVersion}; require 22.19+ or 24–26.`);
  if (!launcher) failures.push('mcode launcher was not found on PATH.');
  if (!entry) failures.push('mcode CLI entry was not resolved; set TALOS_MCODE_ENTRY explicitly.');
  if (!reportedVersion) failures.push('mcode --version did not return a semantic version.');
  if (reportedVersion !== EXPECTED_MCODE_VERSION) {
    failures.push(`mcode version ${reportedVersion ?? 'unknown'} does not match expected source ${EXPECTED_MCODE_VERSION}.`);
  }
  return {
    ok: failures.length === 0,
    node: { executable: process.execPath, version: nodeVersion, supported: supportedNode(nodeVersion) },
    cli: {
      ...(launcher ? { launcher } : {}),
      ...(entry ? { entry } : {}),
      ...(reportedVersion ? { version: reportedVersion } : {}),
      expectedVersion: EXPECTED_MCODE_VERSION,
      matchesExpected: reportedVersion === EXPECTED_MCODE_VERSION,
    },
    failures,
  };
}
