export function workspaceListEntriesToPaths(entries: unknown, limit = 40): string[] {
  if (!Array.isArray(entries)) return [];
  const paths: string[] = [];
  for (const raw of entries) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as { path?: string; type?: string; ignored?: boolean };
    if (row.ignored) continue;
    if (row.type !== 'file' || typeof row.path !== 'string') continue;
    paths.push(row.path);
    if (paths.length >= limit) break;
  }
  return paths;
}
