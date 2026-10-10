import { describe, expect, it } from 'vitest';
import { parseSlashPrompt, planSlashSubmit } from '../src/adapter/slash-prompt.js';

const advertised = [
  { name: 'help', description: 'Help' },
  { name: 'new', description: 'New session' },
  { name: 'status', description: 'Status' },
  { name: 'model', description: 'Model', inputHint: '[provider/model]' },
];

describe('parseSlashPrompt', () => {
  it('parses name and trailing input like Talos ACP', () => {
    expect(parseSlashPrompt('/model provider/foo#thinking')).toEqual({
      name: 'model',
      input: 'provider/foo#thinking',
    });
    expect(parseSlashPrompt('/help')).toEqual({ name: 'help', input: '' });
    expect(parseSlashPrompt('  /New  ')).toEqual({ name: 'new', input: '' });
  });

  it('returns undefined for non-slash prompts', () => {
    expect(parseSlashPrompt('hello')).toBeUndefined();
    expect(parseSlashPrompt('/')).toBeUndefined();
  });
});

describe('planSlashSubmit', () => {
  it('routes /new to host new session instead of engine stub text', () => {
    expect(planSlashSubmit({ prompt: '/new', advertised })).toEqual({ kind: 'host_new_session' });
  });

  it('rejects unknown slash commands before they hit the model', () => {
    expect(planSlashSubmit({ prompt: '/not-a-command', advertised }).kind).toBe('reject');
  });

  it('rejects extra args on no-input commands', () => {
    const plan = planSlashSubmit({ prompt: '/help extra', advertised });
    expect(plan).toEqual({ kind: 'reject', message: '/help 不需要参数。' });
  });

  it('routes built-in slash commands to the host executor', () => {
    expect(planSlashSubmit({ prompt: '  /status  ', advertised })).toEqual({
      kind: 'host_slash',
      name: 'status',
      input: '',
    });
    expect(planSlashSubmit({ prompt: '/model x/y', advertised })).toEqual({
      kind: 'host_slash',
      name: 'model',
      input: 'x/y',
    });
  });

  it('passes through plain text', () => {
    expect(planSlashSubmit({ prompt: 'fix the bug', advertised })).toEqual({
      kind: 'send_prompt',
      prompt: 'fix the bug',
    });
  });
});
