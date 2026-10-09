/** User-facing label for ACP agentInfo; hides legacy protocol ids such as minimax-code. */
export function formatAcpAgentLabel(agentInfo?: {
  name?: string;
  title?: string;
  version?: string;
}): string {
  if (!agentInfo) return 'Talos engine';
  const legacyIds = new Set(['minimax-code', 'mcode', 'minimax']);
  const title = agentInfo.title?.trim();
  const name = agentInfo.name?.trim();
  const display =
    title || (name && !legacyIds.has(name.toLowerCase()) ? name : 'Talos');
  return agentInfo.version ? `${display} ${agentInfo.version}` : display;
}
