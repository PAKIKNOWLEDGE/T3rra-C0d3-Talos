import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function serviceActionTypes(): string[] {
  const typesSource = readFileSync(resolve(root, 'src/core/types.ts'), 'utf8');
  const block = typesSource.split('export type ServiceAction')[1]?.split(';')[0] ?? '';
  return [...block.matchAll(/type: '([^']+)'/g)].map((match) => match[1]);
}

describe('ServiceAction dispatch coverage', () => {
  it('every ServiceAction has a talos-service switch case', () => {
    const service = readFileSync(resolve(root, 'src/service/talos-service.ts'), 'utf8');
    for (const actionType of serviceActionTypes()) {
      expect(service, `missing case for ${actionType}`).toContain(`case '${actionType}':`);
    }
  });
});
