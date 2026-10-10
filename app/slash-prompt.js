/**
 * Keep in sync with src/adapter/slash-prompt.ts (source of truth; vitest covers TS).
 */
const NO_INPUT_COMMANDS = new Set(['help', 'new', 'status', 'doctor', 'context', 'usage']);

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

export function parseSlashPrompt(text) {
  const trimmed = text.trim();
  const match = /^\/([^\s]+)(?:\s+([\s\S]*?))?\s*$/u.exec(trimmed);
  if (!match?.[1]) return undefined;
  return { name: match[1].toLowerCase(), input: match[2]?.trim() ?? '' };
}

export function planSlashSubmit({ prompt, advertised }) {
  const parsed = parseSlashPrompt(prompt);
  if (!parsed) {
    return { kind: 'send_prompt', prompt };
  }

  const names = new Set((advertised ?? []).map((command) => command.name.toLowerCase()));
  if (!names.has(parsed.name)) {
    if (!advertised?.length) {
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

  return { kind: 'send_prompt', prompt };
}
