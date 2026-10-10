import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function engineEventKinds(): string[] {
  const typesSource = readFileSync(resolve(root, 'src/core/types.ts'), 'utf8');
  const block = typesSource.split('export type EngineEvent')[1]?.split('export type SessionModeOption')[0] ?? '';
  return [...block.matchAll(/kind: '([^']+)'/g)].map((match) => match[1]);
}

describe('FactStore EngineEvent coverage', () => {
  it('every EngineEvent kind is handled in fact-store apply', () => {
    const factStore = readFileSync(resolve(root, 'src/core/fact-store.ts'), 'utf8');
    for (const kind of engineEventKinds()) {
      expect(factStore, `missing case for ${kind}`).toContain(`case '${kind}':`);
    }
  });
});
