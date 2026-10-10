import { describe, expect, it } from 'vitest';
import { mapStudioHistoryMessages } from '../src/adapter/session-history.js';

describe('mapStudioHistoryMessages', () => {
  it('maps user and assistant messages in order', () => {
    const { messages, timeline, tools } = mapStudioHistoryMessages([
      { id: 'u1', role: 'user', content: 'Hello' },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'thinking', content: 'ponder' },
          { type: 'text', content: 'Hi there' },
        ],
      },
    ]);
    expect(messages).toEqual([
      { messageId: 'u1', role: 'user', text: 'Hello' },
      { messageId: 'a1', role: 'assistant', text: 'Hi there' },
    ]);
    expect(timeline.map((item) => item.kind)).toEqual(['user', 'thought', 'assistant']);
    expect(tools).toEqual([]);
  });

  it('skips empty assistant bodies', () => {
    const { messages, timeline, tools } = mapStudioHistoryMessages([
      { id: 'a2', role: 'assistant', parts: [{ type: 'thinking', content: 'only thought' }] },
    ]);
    expect(messages).toEqual([]);
    expect(timeline).toEqual([{ kind: 'thought', thoughtId: 'thought-a2', text: 'only thought' }]);
    expect(tools).toEqual([]);
  });

  it('maps historical tool calls into timeline order', () => {
    const { timeline, tools } = mapStudioHistoryMessages([
      {
        id: 'a1',
        role: 'assistant',
        content: 'done',
        toolCalls: [{ id: 't1', name: 'read_file', status: 'completed' }],
      },
    ]);
    expect(timeline.map((item) => item.kind)).toEqual(['assistant', 'tool']);
    expect(tools[0]?.toolCallId).toBe('t1');
  });

  it('interleaves text and tool parts in parts order', () => {
    const { timeline } = mapStudioHistoryMessages([
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'text', content: 'a' },
          { type: 'tool', toolCall: { id: 't1', name: 'grep' } },
          { type: 'text', content: 'b' },
        ],
      },
    ]);
    expect(timeline.map((item) => item.kind)).toEqual(['assistant', 'tool', 'assistant']);
  });
});
