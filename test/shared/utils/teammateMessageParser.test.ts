import { describe, expect, it } from 'vitest';

import { parseAllTeammateMessages } from '../../../src/shared/utils/teammateMessageParser';

describe('parseAllTeammateMessages', () => {
  it('returns empty array when there is no teammate block', () => {
    expect(parseAllTeammateMessages('just a normal user message')).toEqual([]);
    expect(parseAllTeammateMessages('')).toEqual([]);
  });

  it('parses a single block with all attributes', () => {
    const raw =
      '<teammate-message teammate_id="alice" color="blue" summary="Done">Hello</teammate-message>';
    expect(parseAllTeammateMessages(raw)).toEqual([
      { teammateId: 'alice', color: 'blue', summary: 'Done', content: 'Hello' },
    ]);
  });

  it('defaults color and summary to empty string when absent', () => {
    const raw = '<teammate-message teammate_id="bob">Hi</teammate-message>';
    expect(parseAllTeammateMessages(raw)).toEqual([
      { teammateId: 'bob', color: '', summary: '', content: 'Hi' },
    ]);
  });

  it('parses attributes regardless of their order', () => {
    const raw =
      '<teammate-message teammate_id="c" summary="S" color="red">x</teammate-message>';
    const [r] = parseAllTeammateMessages(raw);
    expect(r.color).toBe('red');
    expect(r.summary).toBe('S');
  });

  it('trims surrounding whitespace of content but keeps inner newlines', () => {
    const raw =
      '<teammate-message teammate_id="a" color="x" summary="y">\n  line1\nline2  \n</teammate-message>';
    expect(parseAllTeammateMessages(raw)[0].content).toBe('line1\nline2');
  });

  it('parses multiple blocks in order', () => {
    const raw = [
      '<teammate-message teammate_id="a" color="red" summary="s1">one</teammate-message>',
      '<teammate-message teammate_id="b" color="green" summary="s2">two</teammate-message>',
    ].join('\n');
    const results = parseAllTeammateMessages(raw);
    expect(results.map((r) => r.teammateId)).toEqual(['a', 'b']);
    expect(results.map((r) => r.content)).toEqual(['one', 'two']);
  });

  it('does not merge adjacent blocks (non-greedy content)', () => {
    const raw =
      '<teammate-message teammate_id="a">A</teammate-message><teammate-message teammate_id="b">B</teammate-message>';
    const results = parseAllTeammateMessages(raw);
    expect(results).toHaveLength(2);
    expect(results[0].content).toBe('A');
  });

  it('gives identical results on repeated calls (no regex state leak)', () => {
    const raw = '<teammate-message teammate_id="a">A</teammate-message>';
    expect(parseAllTeammateMessages(raw)).toEqual(parseAllTeammateMessages(raw));
    expect(parseAllTeammateMessages(raw)).toHaveLength(1);
  });

  it('ignores blocks without teammate_id', () => {
    expect(parseAllTeammateMessages('<teammate-message>x</teammate-message>')).toEqual([]);
  });
});
