import type { SessionSlashCommand } from '../core/types.js';

export type ParsedSlashPrompt = {
  name: string;
  input: string;
};

/** Match Talos-CLI `parseCommand` in `packages/tui/src/acp/commands.ts`. */
export function parseSlashPrompt(text: string): ParsedSlashPrompt | undefined {
  const trimmed = text.trim();
  const match = /^\/([^\s]+)(?:\s+([\s\S]*?))?\s*$/u.exec(trimmed);
  if (!match?.[1]) return undefined;
  return { name: match[1].toLowerCase(), input: match[2]?.trim() ?? '' };
}

const NO_INPUT_COMMANDS = new Set([
  'help',
  'new',
  'status',
  'doctor',
  'context',
  'usage',
]);

/** ACP built-ins executed on the desktop host via studio RPC — never `turn/start`. */
export const HOST_SLASH_COMMANDS = new Set([
  'help',
  'status',
  'doctor',
  'context',
  'usage',
  'compact',
  'skills',
  'mcp',
  'model',
]);

export type SlashSubmitPlan =
  | { kind: 'send_prompt'; prompt: string }
  | { kind: 'host_new_session' }
  | { kind: 'host_slash'; name: string; input: string }
  | { kind: 'reject'; message: string };

export function planSlashSubmit(options: {
  prompt: string;
  advertised: readonly SessionSlashCommand[];
}): SlashSubmitPlan {
  const parsed = parseSlashPrompt(options.prompt);
  if (!parsed) {
    return { kind: 'send_prompt', prompt: options.prompt };
  }

  const names = new Set(options.advertised.map((command) => command.name.toLowerCase()));
  if (!names.has(parsed.name)) {
    if (options.advertised.length === 0) {
      return { kind: 'reject', message: '命令列表尚未同步，请稍候或从菜单选择命令。' };
    }
    return { kind: 'reject', message: `未知命令 /${parsed.name}。输入 /help 查看可用命令。` };
  }

  if (NO_INPUT_COMMANDS.has(parsed.name) && parsed.input) {
    return { kind: 'reject', message: `/${parsed.name} 不需要参数。` };
  }

  if (parsed.name === 'new' && !parsed.input) {
    return { kind: 'host_new_session' };
  }

  if (HOST_SLASH_COMMANDS.has(parsed.name)) {
    return { kind: 'host_slash', name: parsed.name, input: parsed.input };
  }

  return { kind: 'send_prompt', prompt: options.prompt };
}
