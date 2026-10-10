import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function enginePortMethods(): string[] {
  const source = readFileSync(resolve(root, 'src/service/talos-service.ts'), 'utf8');
  const block = source.split('export interface EnginePort')[1]?.split('export interface WorkspaceHost')[0] ?? '';
  return [...block.matchAll(/^\s+([a-zA-Z]+)\(/gm)].map((match) => match[1]);
}

describe('EnginePort runtime wiring', () => {
  it('runtime engine object delegates every EnginePort method to adapter', () => {
    const runtime = readFileSync(resolve(root, 'src/service/runtime.ts'), 'utf8');
    for (const method of enginePortMethods()) {
      expect(runtime, `runtime missing ${method}`).toContain(`${method}:`);
      const pattern =
        method === 'replyApproval'
          ? /replyApproval:[\s\S]*?adapter\?\.replyApproval/
          : new RegExp(`${method}:[\\s\\S]*?adapter\\.${method}`);
      expect(runtime, `${method} should call adapter`).toMatch(pattern);
    }
  });
});
