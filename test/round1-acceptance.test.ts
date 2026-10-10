/**
 * Round-1 acceptance bundle: prior product wiring without live Talos / paid model runs.
 */
import { describe, expect, it } from 'vitest';
import { THINKING_EFFORT_CONFIG_ID, extractSessionContext } from '../src/adapter/session-control.js';
import { mapUsageUpdateToContext } from '../src/adapter/usage-from-acp.js';
import { renderAssistantMessageHtml } from '../src/view/message-markdown.js';

describe('round 1 acceptance (machine)', () => {
  it('usage_update maps to session context numbers and label', () => {
    const usage = mapUsageUpdateToContext(12_300, 1_000_000);
    expect(usage.usageUsed).toBe(12_300);
    expect(usage.usageSize).toBe(1_000_000);
    expect(usage.usageLabel).toBe('12.3k');
  });

  it('assistant bubble markdown escapes HTML and renders emphasis', () => {
    const html = renderAssistantMessageHtml('Hello **bold** <script>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).not.toContain('<script>');
  });

  it('thinking effort config id is stable for set_config_option', () => {
    expect(THINKING_EFFORT_CONFIG_ID).toBe('thinkingEffort');
    const ctx = extractSessionContext({
      configOptions: [
        {
          id: 'thinkingEffort',
          category: 'thought_level',
          currentValue: 'high',
          options: [{ value: 'high', name: '高' }],
        },
      ],
    });
    expect(ctx?.thinkingConfigId).toBe('thinkingEffort');
    expect(ctx?.currentThinkingValue).toBe('high');
  });
});
