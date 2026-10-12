import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

/** Talos CLI npm line (0.1.x); pin with TALOS_CLI_VERSION_EXPECTED for strict patch match */
const EXPECTED_TALOS_CLI_LINE = '0.1.x';
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

function expectedCliVersionLabel(): string {
  return process.env.TALOS_CLI_VERSION_EXPECTED?.trim() || EXPECTED_TALOS_CLI_LINE;
}

function versionOnTalosLine(version: string | undefined): boolean {
  if (!version) return false;
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return false;
  return Number(match[1]) === 0 && Number(match[2]) === 1;
}

function versionMatchesExpected(version: string | undefined, expectedLabel: string): boolean {
  if (!version) return false;
  if (expectedLabel.endsWith('.x')) return versionOnTalosLine(version);
  return version === expectedLabel;
}

function findLauncher(): string | undefined {
  const explicit = process.env.TALOS_CLI_LAUNCHER?.trim() || process.env.TALOS_MCODE_LAUNCHER?.trim();
  if (explicit) return resolve(explicit);
  try {
    const output = execFileSync('where.exe', ['talos'], { encoding: 'utf8' });
    const candidates = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return candidates.find((path) => path.toLowerCase().endsWith('.cmd')) ?? candidates[0];
  } catch {
    return undefined;
  }
}

function resolveEntryFromLauncher(launcher: string): string | undefined {
  const base = dirname(launcher);
  const candidates = [
    join(base, 'node_modules', '@pakiknowledge', 'tal0s-code', 'cli.js'),
    join(base, 'node_modules', '@pakiknowledge', 'tal0s-code', 'dist', 'cli.js'),
  ];
  return candidates.find((path) => existsSync(path));
}

function findEntry(launcher: string | undefined): string | undefined {
  const explicit = process.env.TALOS_CLI_ENTRY?.trim() || process.env.TALOS_MCODE_ENTRY?.trim();
  if (explicit) return resolve(explicit);
  if (!launcher) return undefined;
  const fromLauncher = resolveEntryFromLauncher(launcher);
  if (fromLauncher) return fromLauncher;
  if (process.env.TALOS_DESKTOP_BUNDLE === '1') return undefined;
  const adjacent = resolve(process.cwd(), '..', 'Talos-CLI', 'dist', 'cli.js');
  return existsSync(adjacent) ? adjacent : undefined;
}

function readInstalledPackageVersion(entry: string | undefined): string | undefined {
  if (!entry) return undefined;
  const packageJson = join(dirname(entry), 'package.json');
  try {
    const parsed = JSON.parse(readFileSync(packageJson, 'utf8')) as { version?: unknown };
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
  const expectedVersion = expectedCliVersionLabel();
  const launcher = findLauncher();
  const entry = findEntry(launcher);
  const reportedVersion = runEntryVersion(entry) ?? readInstalledPackageVersion(entry);
  const nodeVersion = process.version;
  const failures: string[] = [];
  if (!supportedNode(nodeVersion)) failures.push(`Unsupported Node ${nodeVersion}; require 22.19+ or 24–26.`);
  if (!launcher) failures.push('talos launcher was not found on PATH.');
  if (!entry) {
    failures.push('talos CLI entry was not resolved; set TALOS_CLI_ENTRY to dist/cli.js or install @pakiknowledge/tal0s-code.');
  }
  if (!reportedVersion) failures.push('talos --version did not return a semantic version.');
  if (reportedVersion && !versionMatchesExpected(reportedVersion, expectedVersion)) {
    failures.push(`talos version ${reportedVersion} does not match expected ${expectedVersion}.`);
  }
  return {
    ok: failures.length === 0,
    node: { executable: process.execPath, version: nodeVersion, supported: supportedNode(nodeVersion) },
    cli: {
      ...(launcher ? { launcher } : {}),
      ...(entry ? { entry } : {}),
      ...(reportedVersion ? { version: reportedVersion } : {}),
      expectedVersion,
      matchesExpected: versionMatchesExpected(reportedVersion, expectedVersion),
    },
    failures,
  };
}
