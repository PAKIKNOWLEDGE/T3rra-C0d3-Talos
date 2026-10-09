import { describe, expect, it } from 'vitest';
import { sanitizeAssistantDisplay, textFromSessionUpdate } from '../src/adapter/acp-text.js';
import { extractSessionContext, formatModelWireValue } from '../src/adapter/session-control.js';
import { MinimaxAcpAdapter, prepareTalosAcpClient } from '../src/adapter/minimax-acp.js';
import { parseAvailableCommands } from '../src/adapter/slash-commands.js';
import { FactStore } from '../src/core/fact-store.js';
import { TalosService } from '../src/service/talos-service.js';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readSessionBinding, writeSessionBinding } from '../src/host/session-binding.js';

describe('acp text helpers', () => {
  it('reads text chunks from session updates', () => {
    const update = {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'hello' },
    } as Parameters<typeof textFromSessionUpdate>[0];
    expect(textFromSessionUpdate(update)).toBe('hello');
  });

  it('strips redacted thinking from assistant display', () => {
    const raw = '<think>secret</think>visible';
    expect(sanitizeAssistantDisplay(raw)).toBe('visible');
  });
});

describe('talos acp client wiring', () => {
  it('registers inbound handlers before connect via prepareTalosAcpClient', () => {
    const { holder } = prepareTalosAcpClient();
    const events: Array<{ kind: string; context?: { availableCommands?: unknown } }> = [];
    const connection = {
      agent: { request: async () => ({}), notify: async () => {} },
      close: () => {},
    };
    MinimaxAcpAdapter.attach(holder, connection as never, 1, (event) => {
      events.push(event);
    });
    holder.adapter?.receiveSessionNotification({
      sessionId: 's1',
      update: {
        sessionUpdate: 'available_commands_update',
        availableCommands: [{ name: 'help', description: 'Show help' }],
      },
    });
    expect(events.at(-1)).toMatchObject({
      kind: 'session.context',
      context: { availableCommands: [{ name: 'help', description: 'Show help' }] },
    });
  });
});

describe('slash commands', () => {
  it('parses available_commands_update payloads', () => {
    const commands = parseAvailableCommands({
      availableCommands: [
        { name: 'help', description: 'Show help', input: { hint: 'topic' } },
        { name: 'status', description: 'Session status' },
        { description: 'missing name' },
      ],
    });
    expect(commands).toEqual([
      { name: 'help', description: 'Show help', inputHint: 'topic' },
      { name: 'status', description: 'Session status' },
    ]);
  });

  it('merges advertised commands from session context extraction', () => {
    const context = extractSessionContext({
      modes: { currentModeId: 'default', availableModes: [{ id: 'default', name: 'Default' }] },
      availableCommands: [{ name: 'help', description: 'Help' }],
      configOptions: [],
    });
    expect(context?.availableCommands).toEqual([{ name: 'help', description: 'Help' }]);
  });
});

describe('session context extraction', () => {
  it('maps model and mode config options when present', () => {
    const context = extractSessionContext({
      modes: [{ id: 'default', name: 'Agent' }],
      configOptions: [
        { category: 'Model', currentValue: 'talos-mini' },
        { category: 'Context usage', currentValue: '12.4k / 128k' },
      ],
    });
    expect(context?.modeLabel).toBe('Agent');
    expect(context?.modelLabel).toBe('talos-mini');
    expect(context?.usageLabel).toBe('12.4k');
  });

  it('prefers human-readable model option name over wire value', () => {
    const wire = 'm:custom_provider%3Axiaomi:some-model-id:u';
    const context = extractSessionContext({
      modes: { currentModeId: 'default', availableModes: [{ id: 'default', name: 'Default' }] },
      configOptions: [
        {
          id: 'model',
          category: 'model',
          currentValue: wire,
          options: [{ value: wire, name: 'Xiaomi (custom)' }],
        },
      ],
    });
    expect(context?.modelLabel).toBe('Xiaomi (custom)');
  });

  it('decodes model wire value when no option label exists', () => {
    expect(formatModelWireValue('m:custom_provider%3Axiaomi:m')).toBe('custom_provider:xiaomi · m');
  });

  it('extracts mode and model pickers from session control payload', () => {
    const context = extractSessionContext({
      modes: {
        currentModeId: 'plan',
        availableModes: [
          { id: 'default', name: 'Default' },
          { id: 'plan', name: 'Plan' },
        ],
      },
      configOptions: [
        {
          id: 'model',
          category: 'model',
          currentValue: 'm:a:b:u',
          options: [{ value: 'm:a:b:u', name: 'Model A' }],
        },
      ],
    });
    expect(context?.availableModes).toHaveLength(2);
    expect(context?.currentModeId).toBe('plan');
    expect(context?.modelOptions?.[0].name).toBe('Model A');
    expect(context?.modelConfigId).toBe('model');
  });

  it('reads Talos SessionModeState shape for modes', () => {
    const context = extractSessionContext({
      modes: {
        currentModeId: 'plan',
        availableModes: [
          { id: 'default', name: 'Default' },
          { id: 'plan', name: 'Plan' },
        ],
      },
      configOptions: [],
    });
    expect(context?.modeLabel).toBe('Plan');
  });
});

describe('fact store messages and context', () => {
  it('appends user and assistant chunks by messageId', () => {
    const service = new TalosService(new FactStore('s'), {
      sendPrompt: async () => {},
      cancel: async () => {},
      replyApproval: async () => {},
      setMode: async () => {},
      setConfigOption: async () => {},
      createSession: async () => {},
      loadSession: async () => {},
    });
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({
      kind: 'user.message',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'u1',
      text: 'hi ',
    });
    service.apply({
      kind: 'user.message',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'u1',
      text: 'there',
    });
    service.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'a1',
      text: 'ok',
    });
    service.apply({
      kind: 'assistant.delta',
      processEpoch: 1,
      sessionId: 's1',
      messageId: 'a1',
      text: '!',
    });
    expect(service.snapshot().messages).toEqual([
      { messageId: 'u1', role: 'user', text: 'hi there' },
      { messageId: 'a1', role: 'assistant', text: 'ok!' },
    ]);
  });

  it('merges session.context into snapshot', () => {
    const service = new TalosService(new FactStore('s'), {
      sendPrompt: async () => {},
      cancel: async () => {},
      replyApproval: async () => {},
      setMode: async () => {},
      setConfigOption: async () => {},
      createSession: async () => {},
      loadSession: async () => {},
    });
    service.apply({ kind: 'connected', processEpoch: 1 });
    service.apply({
      kind: 'session.context',
      processEpoch: 1,
      sessionId: 's1',
      context: { modelLabel: 'm1' },
    });
    service.apply({
      kind: 'session.context',
      processEpoch: 1,
      sessionId: 's1',
      context: { usageLabel: '9k' },
    });
    expect(service.snapshot().context).toEqual({ modelLabel: 'm1', usageLabel: '9k' });
  });
});

describe('session binding file', () => {
  it('round-trips sessionId and cwd under .talos', () => {
    const dir = mkdtempSync(join(tmpdir(), 'talos-bind-'));
    try {
      writeSessionBinding(dir, { sessionId: 'sess-1', cwd: dir });
      const binding = readSessionBinding(dir);
      expect(binding?.sessionId).toBe('sess-1');
      expect(binding?.cwd).toBe(dir);
      expect(readFileSync(join(dir, '.talos', 'gui-session.json'), 'utf8')).toContain('sess-1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
