import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'app/index.html'), 'utf8');
const manifest = JSON.parse(
  readFileSync(resolve(root, 'app/ui-manifest.json'), 'utf8'),
) as { elements: { id: string; status: string }[] };

const manifestIds = new Set(manifest.elements.map((row) => row.id));

const productIds = [...html.matchAll(/\bid="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((id) => !id.startsWith('i-'));

describe('app/ui-manifest.json', () => {
  it('every product shell id is registered in the manifest', () => {
    for (const id of productIds) {
      expect(manifestIds.has(id), `manifest missing shell id ${id}`).toBe(true);
    }
  });

  it('every manifest id exists in product HTML', () => {
    for (const id of manifestIds) {
      expect(html, `missing #${id} in index.html`).toContain(`id="${id}"`);
    }
  });

  it('covers primary shell controls', () => {
    const required = [
      'log',
      'composer',
      'inspector',
      'toast',
      'detailDialog',
      'detailTitle',
      'detailContent',
      'dialogFootnote',
      'statusDisconnected',
      'statusConnected',
    ];
    for (const id of required) {
      expect(manifestIds.has(id), `manifest missing ${id}`).toBe(true);
      expect(html).toContain(`id="${id}"`);
    }
  });
});
