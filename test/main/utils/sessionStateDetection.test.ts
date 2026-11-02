import { describe, expect, it } from 'vitest';

import { checkMessagesOngoing } from '../../../src/main/utils/sessionStateDetection';

import type { ParsedMessage } from '../../../src/main/types';

type Block = Record<string, unknown>;

const asst = (...content: Block[]): ParsedMessage =>
  ({ type: 'assistant', content }) as unknown as ParsedMessage;
const user = (content: Block[], toolUseResult?: unknown): ParsedMessage =>
  ({ type: 'user', content, toolUseResult }) as unknown as ParsedMessage;

const text = (t: string): Block => ({ type: 'text', text: t });
const thinking = (t = 'hmm'): Block => ({ type: 'thinking', thinking: t });
const toolUse = (id: string, name = 'Read', input: Block = {}): Block => ({
  type: 'tool_use',
  id,
  name,
  input,
});
const toolResult = (id: string): Block => ({ type: 'tool_result', tool_use_id: id, content: 'ok' });

describe('checkMessagesOngoing', () => {
  it('is false for no messages', () => {
    expect(checkMessagesOngoing([])).toBe(false);
  });

  it('is false when the last activity is assistant text output', () => {
    expect(checkMessagesOngoing([asst(text('All done'))])).toBe(false);
  });

  it('is true when a tool_use has not been followed by text', () => {
    expect(checkMessagesOngoing([asst(toolUse('t1'))])).toBe(true);
  });

  it('is true when a tool_result is pending after text', () => {
    const msgs = [asst(text('working'), toolUse('t1')), user([toolResult('t1')])];
    expect(checkMessagesOngoing(msgs)).toBe(true);
  });

  it('is false once final text follows tool activity', () => {
    const msgs = [
      asst(toolUse('t1')),
      user([toolResult('t1')]),
      asst(text('Finished')),
    ];
    expect(checkMessagesOngoing(msgs)).toBe(false);
  });

  it('is true when thinking comes after the last text', () => {
    expect(checkMessagesOngoing([asst(text('a')), asst(thinking())])).toBe(true);
  });

  it('is true for thinking alone', () => {
    expect(checkMessagesOngoing([asst(thinking())])).toBe(true);
  });

  it('ignores whitespace-only text and empty thinking', () => {
    expect(checkMessagesOngoing([asst(text('   '))])).toBe(false);
    expect(checkMessagesOngoing([asst({ type: 'thinking', thinking: '' })])).toBe(false);
  });

  it('treats ExitPlanMode as an ending event', () => {
    const msgs = [asst(toolUse('t1')), asst(toolUse('p1', 'ExitPlanMode'))];
    expect(checkMessagesOngoing(msgs)).toBe(false);
  });

  it('is ongoing again if work continues after ExitPlanMode', () => {
    const msgs = [asst(toolUse('p1', 'ExitPlanMode')), asst(toolUse('t2'))];
    expect(checkMessagesOngoing(msgs)).toBe(true);
  });

  it('treats a user interruption as an ending event', () => {
    const msgs = [
      asst(toolUse('t1')),
      user([text('[Request interrupted by user for tool use]')]),
    ];
    expect(checkMessagesOngoing(msgs)).toBe(false);
  });

  it('treats a user-rejected tool result as an ending event', () => {
    const msgs = [asst(toolUse('t1')), user([toolResult('t1')], 'User rejected tool use')];
    expect(checkMessagesOngoing(msgs)).toBe(false);
  });

  it('treats a normal toolUseResult string as ordinary tool_result activity', () => {
    const msgs = [asst(toolUse('t1')), user([toolResult('t1')], 'something else')];
    expect(checkMessagesOngoing(msgs)).toBe(true);
  });

  it('treats SendMessage shutdown_response (approve: true) and its result as ending', () => {
    const shutdown = toolUse('s1', 'SendMessage', { type: 'shutdown_response', approve: true });
    expect(checkMessagesOngoing([asst(toolUse('t0')), asst(shutdown)])).toBe(false);
    expect(
      checkMessagesOngoing([asst(toolUse('t0')), asst(shutdown), user([toolResult('s1')])])
    ).toBe(false);
  });

  it('does not treat shutdown_response with approve: false as ending', () => {
    const rejected = toolUse('s1', 'SendMessage', { type: 'shutdown_response', approve: false });
    expect(checkMessagesOngoing([asst(rejected)])).toBe(true);
  });

  it('does not treat other SendMessage calls as ending', () => {
    const msg = toolUse('s1', 'SendMessage', { type: 'message' });
    expect(checkMessagesOngoing([asst(msg)])).toBe(true);
  });

  it('ignores string-content messages', () => {
    const msgs = [{ type: 'user', content: 'hello' }] as unknown as ParsedMessage[];
    expect(checkMessagesOngoing(msgs)).toBe(false);
  });
});
