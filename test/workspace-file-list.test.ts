import { describe, expect, it } from 'vitest';
import { workspaceListEntriesToPaths } from '../src/adapter/workspace-file-list.js';

describe('workspaceListEntriesToPaths', () => {
  it('keeps file paths and skips directories', () => {
    const paths = workspaceListEntriesToPaths(
      [
        { path: 'src/a.ts', type: 'file' },
        { path: 'src', type: 'directory' },
        { path: 'ignored.md', type: 'file', ignored: true },
      ],
      10,
    );
    expect(paths).toEqual(['src/a.ts']);
  });
});
