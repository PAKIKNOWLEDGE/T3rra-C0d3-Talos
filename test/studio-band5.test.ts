import { describe, expect, it } from 'vitest';
import {
  formatContextSnapshotLabel,
  parseBackgroundTasks,
  parseGoalStatus,
  parseInstalledPlugins,
} from '../src/adapter/studio-band5.js';
import { parseInspectionBundle } from '../src/adapter/studio-inspection.js';

describe('studio band5 parsers', () => {
  it('parses background tasks and plugins', () => {
    expect(parseBackgroundTasks({ tasks: [{ taskId: 't1', kind: 'bash', status: 'running' }] })).toHaveLength(
      1,
    );
    expect(parseInstalledPlugins({ plugins: [{ name: 'p1' }] })).toEqual(['p1']);
  });

  it('marks goal disabled without drawing fake objective', () => {
    expect(parseGoalStatus(undefined, true)).toEqual({ available: false });
    expect(parseGoalStatus({ goal: { objective: 'ship' } }, false)).toMatchObject({
      available: true,
      objective: 'ship',
    });
  });

  it('formats context snapshot label', () => {
    const label = formatContextSnapshotLabel({
      snapshot: { contextUsage: { usedTokens: 1000, contextWindowTokens: 200000 } },
    });
    expect(label).toContain('1,000');
  });

  it('bundles band5 fields into inspection', () => {
    const inspection = parseInspectionBundle(
      { skills: [] },
      { servers: [] },
      {},
      undefined,
      undefined,
      { snapshot: { contextUsage: { usedTokens: 1, contextWindowTokens: 2 } } },
      { tasks: [{ taskId: 't1', kind: 'bash', status: 'queued' }] },
      { plugins: [{ name: 'x' }] },
      undefined,
      true,
    );
    expect(inspection.goal).toEqual({ available: false });
    expect(inspection.backgroundTasks).toHaveLength(1);
    expect(inspection.installedPlugins).toEqual(['x']);
    expect(inspection.contextSnapshotLabel).toBeTruthy();
  });
});
