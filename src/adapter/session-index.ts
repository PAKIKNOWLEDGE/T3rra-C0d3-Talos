import type { SessionIndexItem } from '../core/types.js';

const MAX_PAGES = 20;

type RawSession = {
  sessionId?: string;
  cwd?: string;
  workspaceDir?: string;
  title?: string;
  updatedAt?: string;
  archived?: boolean;
};

function itemFromRaw(raw: unknown): SessionIndexItem | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as RawSession;
  const sessionId = typeof row.sessionId === 'string' ? row.sessionId.trim() : '';
  const cwd =
    (typeof row.cwd === 'string' ? row.cwd.trim() : '') ||
    (typeof row.workspaceDir === 'string' ? row.workspaceDir.trim() : '');
  if (!sessionId || !cwd) return undefined;
  const title = typeof row.title === 'string' ? row.title.trim() : '';
  const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt.trim() : '';
  return {
    sessionId,
    cwd,
    ...(title ? { title } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    ...(row.archived === true ? { archived: true } : {}),
  };
}

export function parseSessionIndex(source: unknown): SessionIndexItem[] {
  if (!source || typeof source !== 'object') return [];
  const list = (source as { sessions?: unknown }).sessions;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const items: SessionIndexItem[] = [];
  for (const raw of list) {
    const item = itemFromRaw(raw);
    if (!item || seen.has(item.sessionId)) continue;
    seen.add(item.sessionId);
    items.push(item);
  }
  return items.sort((left, right) => {
    const a = left.updatedAt ?? '';
    const b = right.updatedAt ?? '';
    if (a === b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a < b ? 1 : -1;
  });
}

export function nextListCursor(source: unknown): string | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const cursor = (source as { nextCursor?: unknown }).nextCursor;
  return typeof cursor === 'string' && cursor.trim() ? cursor.trim() : undefined;
}

export function mergeSessionPages(pages: unknown[]): SessionIndexItem[] {
  return parseSessionIndex({ sessions: pages.flatMap((page) => parseSessionIndex(page)) });
}

export function listPageLimit(): number {
  return MAX_PAGES;
}
