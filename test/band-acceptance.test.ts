/**
 * Machine checks that band 0–5 spine methods stay wired (no live engine).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8');

describe('band acceptance (source spine)', () => {
  it('studio adapter exposes matrix-critical RPC names', () => {
    const studio = read('src/adapter/talos-studio.ts');
    const required = [
      'studio/initialize',
      'session/list',
      'session/create',
      'session/load',
      'session/resume',
      'session/messages',
      'turn/start',
      'turn/cancel',
      'turn/watch',
      'turn/steer',
      'commands/list',
      'session/setMode',
      'permission/list',
      'permission/reply',
      'inspection/usage',
      'inspection/usageSummary',
      'usage/commits/subscribe',
      'account/status',
      'session/rewind',
      'session/fork',
      'queue/enqueue',
      'workspace/files/search',
      'workspace/files/list',
      'session/close',
      'session/rename',
      'session/archive',
      'questionnaire/reply',
      'questionnaire/dismiss',
      'queue/enqueue',
      'queue/continue',
      'session/rewindPreview',
      'session/editMessage',
      'session/fork',
      'backgroundTasks/list',
      'plugins/listInstalled',
      'delegation/get',
      'goal/get',
    ];
    for (const method of required) {
      expect(studio, `missing ${method}`).toContain(method);
    }
  });

  it('workspace bind prefers session/resume before load fallback', () => {
    const bind = read('src/service/workspace-session.ts');
    expect(bind).toContain('resumeSession');
    expect(bind).toContain('loadSession');
    expect(bind.indexOf('resumeSession')).toBeLessThan(bind.indexOf('loadSession'));
  });

  it('slash host does not route built-ins through turn/start', () => {
    const slash = read('src/adapter/studio-slash.ts');
    expect(slash).not.toMatch(/turn\/start/);
  });

  it('product runtime spawns talos studio not legacy ACP entry', () => {
    const runtime = read('src/service/runtime.ts');
    const host = read('src/host/talos-studio-process.ts');
    expect(runtime).toContain('startTalosStudioProcess');
    expect(runtime).not.toMatch(/minimax-acp|startAcp/i);
    expect(host).toMatch(/studio/);
  });

  it('sendPrompt uses turn/start with plain text input', () => {
    const studio = read('src/adapter/talos-studio.ts');
    expect(studio).toMatch(/request\('turn\/start'[\s\S]*input:\s*prompt/);
  });

  it('composer routes slash through execute_slash not send_prompt', () => {
    const ui = read('app/talos.js');
    expect(ui).toContain("type: 'execute_slash'");
    expect(ui).toMatch(/host_slash[\s\S]*execute_slash/);
  });
});
