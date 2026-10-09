import type { SessionSlashCommand } from '../core/types.js';

type RawCommand = {
  name?: string;
  description?: string;
  input?: { hint?: string } | null;
};

function inputHint(input: RawCommand['input']): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const hint = input.hint;
  return typeof hint === 'string' && hint.trim() ? hint.trim() : undefined;
}

/** Normalize ACP `availableCommands` arrays from session responses or `available_commands_update`. */
export function parseAvailableCommands(source: unknown): SessionSlashCommand[] | undefined {
  if (!source || typeof source !== 'object') return undefined;
  const list = (source as { availableCommands?: unknown }).availableCommands;
  if (!Array.isArray(list)) return undefined;
  const commands: SessionSlashCommand[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as RawCommand;
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) continue;
    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    const command: SessionSlashCommand = { name, ...(description ? { description } : {}) };
    const hint = inputHint(raw.input);
    if (hint) command.inputHint = hint;
    commands.push(command);
  }
  return commands.length ? commands : undefined;
}
