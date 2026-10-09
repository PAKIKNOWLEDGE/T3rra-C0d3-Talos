import type { SessionContext, SessionModeOption, SessionModelOption } from '../core/types.js';
import { parseAvailableCommands } from './slash-commands.js';

type ModeEntry = { id?: string; name?: string; description?: string };
type ConfigOption = {
  category?: string;
  name?: string;
  currentValue?: string;
  options?: Array<{ value?: string; name?: string }>;
};

/** Talos ACP returns `modes` as SessionModeState (`currentModeId` + `availableModes`), not a bare array. */
function modeLabelFromModes(modes: unknown): string | undefined {
  if (!modes || typeof modes !== 'object') return undefined;
  if (Array.isArray(modes)) {
    const named = modes.find((item) => item && typeof item === 'object' && (item as ModeEntry).name) as
      | ModeEntry
      | undefined;
    return named?.name ?? (modes[0] as ModeEntry | undefined)?.id;
  }
  const state = modes as { currentModeId?: string; availableModes?: ModeEntry[] };
  const currentId = state.currentModeId;
  const match = state.availableModes?.find((item) => item.id === currentId);
  if (match?.name) return match.name;
  if (currentId) return currentId;
  const fallback = state.availableModes?.find((item) => item.name)?.name;
  return fallback ?? state.availableModes?.[0]?.id;
}

function configOptionList(configOptions: unknown): ConfigOption[] {
  return Array.isArray(configOptions) ? (configOptions as ConfigOption[]) : [];
}

/** Talos wire value from `modelConfigValue()` — show decoded provider/model in the product shell. */
export function formatModelWireValue(value: string): string {
  if (!value.startsWith('m:')) return value;
  const parts = value.split(':');
  if (parts.length < 3) return value;
  try {
    const provider = decodeURIComponent(parts[1]);
    const modelId = decodeURIComponent(parts[2]);
    const base = modelId ? `${provider} · ${modelId}` : provider;
    if (parts[3] === 'v' && parts[4]) return `${base} (${decodeURIComponent(parts.join(':').split(':v:')[1] ?? parts[4])})`;
    return base;
  } catch {
    return value;
  }
}

function displayValueForConfigOption(option: ConfigOption): string | undefined {
  const current = option.currentValue;
  if (current) {
    const named = option.options?.find((item) => item.value === current)?.name;
    if (named) return named;
    return formatModelWireValue(current);
  }
  return option.options?.find((item) => item.name)?.name;
}

function extractModeOptions(modes: unknown): Pick<SessionContext, 'currentModeId' | 'availableModes' | 'modeLabel'> {
  if (!modes || typeof modes !== 'object' || Array.isArray(modes)) {
    return { modeLabel: modeLabelFromModes(modes) };
  }
  const state = modes as { currentModeId?: string; availableModes?: ModeEntry[] };
  const availableModes: SessionModeOption[] = (state.availableModes ?? [])
    .filter((item) => item?.id)
    .map((item) => ({ id: item.id!, name: item.name ?? item.id! }));
  const currentModeId = state.currentModeId;
  const current = availableModes.find((item) => item.id === currentModeId);
  return {
    currentModeId,
    availableModes: availableModes.length ? availableModes : undefined,
    modeLabel: current?.name ?? modeLabelFromModes(modes),
  };
}

function extractModelOptions(configOptions: unknown): Pick<
  SessionContext,
  'modelConfigId' | 'currentModelValue' | 'modelOptions' | 'modelLabel'
> {
  const out: Pick<SessionContext, 'modelConfigId' | 'currentModelValue' | 'modelOptions' | 'modelLabel'> = {};
  for (const option of configOptionList(configOptions)) {
    const key = String(option.id ?? option.category ?? option.name ?? '').toLowerCase();
    if (key !== 'model' && !key.includes('model')) continue;
    out.modelConfigId = option.id ?? 'model';
    out.currentModelValue = option.currentValue;
    const options: SessionModelOption[] = (option.options ?? [])
      .filter((item) => item.value)
      .map((item) => ({
        value: item.value!,
        name: item.name ?? formatModelWireValue(item.value!),
      }));
    if (options.length) out.modelOptions = options;
    const display = displayValueForConfigOption(option);
    if (display) out.modelLabel = display;
    break;
  }
  return out;
}

export function extractSessionContext(result: unknown): SessionContext | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const payload = result as { modes?: unknown; configOptions?: unknown; availableCommands?: unknown };
  const availableCommands = parseAvailableCommands(payload);
  const context: SessionContext = {
    ...extractModeOptions(payload.modes),
    ...extractModelOptions(payload.configOptions),
    ...(availableCommands ? { availableCommands } : {}),
  };
  for (const option of configOptionList(payload.configOptions)) {
    const display = displayValueForConfigOption(option);
    if (!display) continue;
    const key = String(option.id ?? option.category ?? option.name ?? '').toLowerCase();
    if (key === 'model' || key.includes('model')) {
      if (!context.modelLabel) context.modelLabel = display;
      continue;
    }
    else if (key.includes('permission')) {
      /* permission mode is process-scoped; not shown in masthead yet */
    } else if (key.includes('mode')) context.modeLabel = display;
    else if (key.includes('usage') || key.includes('context')) {
      const numeric = display.match(/[\d,.]+[kKmM]?/);
      if (numeric) context.usageLabel = numeric[0];
    }
  }
  return Object.keys(context).length ? context : undefined;
}
