import { describe, expect, it } from 'vitest';

import { extractToolCalls, extractToolResults } from '../../../src/main/utils/toolExtraction';

import type { ContentBlock } from '../../../src/main/types';

describe('extractToolCalls', () => {
  it('returns [] for string content', () => {
    expect(extractToolCalls('hello')).toEqual([]);
  });

  it('returns [] for empty array', () => {
    expect(extractToolCalls([])).toEqual([]);
  });

  it('extracts a regular tool_use as non-Task', () => {
    const content = [
      { type: 'tool_use', id: 't1', name: 'Read', input: { file_path: '/a' } },
    ] as ContentBlock[];
    expect(extractToolCalls(content)).toEqual([
      { id: 't1', name: 'Read', input: { file_path: '/a' }, isTask: false },
    ]);
  });

  it('flags Task calls and captures description / subagent type', () => {
    const content = [
      {
        type: 'tool_use',
        id: 't2',
        name: 'Task',
        input: { description: 'Do X', subagent_type: 'Explore' },
      },
    ] as ContentBlock[];
    const [call] = extractToolCalls(content);
    expect(call.isTask).toBe(true);
    expect(call.taskDescription).toBe('Do X');
    expect(call.taskSubagentType).toBe('Explore');
  });

  it('does not set Task fields for non-Task tools', () => {
    const content = [
      { type: 'tool_use', id: 't', name: 'Bash', input: { description: 'x' } },
    ] as ContentBlock[];
    expect(extractToolCalls(content)[0].taskDescription).toBeUndefined();
  });

  it('defaults missing input to an empty object', () => {
    const content = [{ type: 'tool_use', id: 't', name: 'Glob' }] as ContentBlock[];
    expect(extractToolCalls(content)[0].input).toEqual({});
  });

  it('skips tool_use blocks missing id or name', () => {
    const content = [
      { type: 'tool_use', name: 'NoId' },
      { type: 'tool_use', id: 'noname' },
    ] as ContentBlock[];
    expect(extractToolCalls(content)).toEqual([]);
  });

  it('ignores non tool_use blocks and preserves order', () => {
    const content = [
      { type: 'text', text: 'hi' },
      { type: 'tool_use', id: 'a', name: 'Read', input: {} },
      { type: 'tool_use', id: 'b', name: 'Edit', input: {} },
    ] as ContentBlock[];
    expect(extractToolCalls(content).map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('extractToolResults', () => {
  it('returns [] for string content', () => {
    expect(extractToolResults('hello')).toEqual([]);
  });

  it('extracts tool_result with content and error flag', () => {
    const content = [
      { type: 'tool_result', tool_use_id: 'u1', content: 'ok', is_error: true },
    ] as ContentBlock[];
    expect(extractToolResults(content)).toEqual([
      { toolUseId: 'u1', content: 'ok', isError: true },
    ]);
  });

  it('defaults isError to false and content to empty string', () => {
    const content = [{ type: 'tool_result', tool_use_id: 'u2' }] as ContentBlock[];
    expect(extractToolResults(content)).toEqual([
      { toolUseId: 'u2', content: '', isError: false },
    ]);
  });

  it('skips tool_result without tool_use_id and non-result blocks', () => {
    const content = [
      { type: 'tool_result', content: 'orphan' },
      { type: 'text', text: 'x' },
    ] as ContentBlock[];
    expect(extractToolResults(content)).toEqual([]);
  });

  it('keeps array-typed content untouched', () => {
    const inner = [{ type: 'text', text: 'r' }];
    const content = [{ type: 'tool_result', tool_use_id: 'u3', content: inner }] as ContentBlock[];
    expect(extractToolResults(content)[0].content).toBe(inner);
  });
});
