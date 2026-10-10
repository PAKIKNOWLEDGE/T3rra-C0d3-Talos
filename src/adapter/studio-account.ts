export type AccountStatusView = {
  label: string;
  authMode?: string;
};

export function formatAccountStatus(raw: unknown): AccountStatusView | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const nested = (raw as { status?: unknown }).status;
  const record =
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>)
      : (raw as Record<string, unknown>);
  const authMode = typeof record.authMode === 'string' ? record.authMode : undefined;
  const accountStatus = typeof record.status === 'string' ? record.status : undefined;
  const modelSource = typeof record.modelSource === 'string' ? record.modelSource : undefined;
  const parts = [
    accountStatus ? `账号 ${accountStatus}` : undefined,
    authMode ? `认证 ${authMode}` : undefined,
    modelSource ? `模型源 ${modelSource}` : undefined,
  ].filter(Boolean);
  if (!parts.length) return undefined;
  return { label: parts.join(' · '), ...(authMode ? { authMode } : {}) };
}
