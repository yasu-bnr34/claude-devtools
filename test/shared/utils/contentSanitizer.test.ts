import { describe, expect, it } from 'vitest';

import {
  extractSlashInfo,
  isCommandContent,
  isCommandOutputContent,
  parseTaskNotifications,
  sanitizeDisplayContent,
} from '../../../src/shared/utils/contentSanitizer';

describe('isCommandContent', () => {
  it('detects built-in command ordering (command-name first)', () => {
    expect(isCommandContent('<command-name>/model</command-name>')).toBe(true);
  });

  it('detects skill command ordering (command-message first)', () => {
    expect(isCommandContent('<command-message>x</command-message>')).toBe(true);
  });

  it('rejects regular text and mid-string tags', () => {
    expect(isCommandContent('hello')).toBe(false);
    expect(isCommandContent('hi <command-name>/x</command-name>')).toBe(false);
  });
});

describe('isCommandOutputContent', () => {
  it('detects stdout and stderr wrappers at the start', () => {
    expect(isCommandOutputContent('<local-command-stdout>a</local-command-stdout>')).toBe(true);
    expect(isCommandOutputContent('<local-command-stderr>a</local-command-stderr>')).toBe(true);
  });

  it('rejects other content', () => {
    expect(isCommandOutputContent('plain')).toBe(false);
    expect(isCommandOutputContent('<command-name>/x</command-name>')).toBe(false);
  });
});

describe('sanitizeDisplayContent', () => {
  it('returns regular content unchanged (trimmed)', () => {
    expect(sanitizeDisplayContent('  hello world  ')).toBe('hello world');
  });

  it('extracts stdout from command output messages', () => {
    expect(sanitizeDisplayContent('<local-command-stdout>  done\n</local-command-stdout>')).toBe(
      'done'
    );
  });

  it('extracts stderr from command output messages', () => {
    expect(sanitizeDisplayContent('<local-command-stderr>oops</local-command-stderr>')).toBe(
      'oops'
    );
  });

  it('renders slash command with args as "/name args"', () => {
    const raw =
      '<command-name>/model</command-name><command-message>model</command-message><command-args>sonnet</command-args>';
    expect(sanitizeDisplayContent(raw)).toBe('/model sonnet');
  });

  it('renders slash command without args as "/name"', () => {
    expect(sanitizeDisplayContent('<command-name>/clear</command-name>')).toBe('/clear');
  });

  it('renders skill-style command (command-message first)', () => {
    const raw =
      '<command-message>review</command-message><command-name>/review</command-name><command-args>PR 1</command-args>';
    expect(sanitizeDisplayContent(raw)).toBe('/review PR 1');
  });

  it('removes system-reminder blocks including multi-line bodies', () => {
    const raw = 'before<system-reminder>\nsecret\nstuff\n</system-reminder>after';
    expect(sanitizeDisplayContent(raw)).toBe('beforeafter');
  });

  it('removes local-command-caveat and task-notification blocks', () => {
    const raw =
      '<local-command-caveat>c</local-command-caveat>keep<task-notification><task-id>1</task-id></task-notification>';
    expect(sanitizeDisplayContent(raw)).toBe('keep');
  });

  it('removes multiple noise blocks independently (non-greedy)', () => {
    const raw = '<system-reminder>a</system-reminder>mid<system-reminder>b</system-reminder>';
    expect(sanitizeDisplayContent(raw)).toBe('mid');
  });

  it('is case-insensitive for noise tags', () => {
    expect(sanitizeDisplayContent('x<SYSTEM-REMINDER>a</SYSTEM-REMINDER>')).toBe('x');
  });

  it('strips leftover command tags in mixed content', () => {
    const raw = 'text <command-name>/a</command-name> more';
    expect(sanitizeDisplayContent(raw)).not.toContain('command-name');
    expect(sanitizeDisplayContent(raw)).toContain('text');
    expect(sanitizeDisplayContent(raw)).toContain('more');
  });

  it('removes trailing "Read the output file" instruction', () => {
    const raw = 'Task finished. Read the output file to retrieve the result: /tmp/out.txt';
    expect(sanitizeDisplayContent(raw)).toBe('Task finished.');
  });
});

describe('extractSlashInfo', () => {
  it('returns null when content is not a slash command', () => {
    expect(extractSlashInfo('hello')).toBeNull();
  });

  it('extracts name, message and args', () => {
    const raw =
      '<command-name>/isolate-context</command-name><command-message>isolate-context</command-message><command-args>foo bar</command-args>';
    expect(extractSlashInfo(raw)).toEqual({
      name: 'isolate-context',
      message: 'isolate-context',
      args: 'foo bar',
    });
  });

  it('leaves message and args undefined when absent', () => {
    const info = extractSlashInfo('<command-name>/help</command-name>');
    expect(info?.name).toBe('help');
    expect(info?.message).toBeUndefined();
    expect(info?.args).toBeUndefined();
  });

  it('strips the leading slash from the name', () => {
    expect(extractSlashInfo('<command-name>/x</command-name>')?.name).toBe('x');
  });
});

describe('parseTaskNotifications', () => {
  it('returns [] when no notification present', () => {
    expect(parseTaskNotifications('nothing here')).toEqual([]);
  });

  it('parses all fields of one notification', () => {
    const raw =
      '<task-notification><task-id>abc</task-id><status>completed</status><summary>Build ok\n</summary><output-file>/tmp/o.txt</output-file></task-notification>';
    expect(parseTaskNotifications(raw)).toEqual([
      { taskId: 'abc', status: 'completed', summary: 'Build ok', outputFile: '/tmp/o.txt' },
    ]);
  });

  it('defaults missing fields to empty strings', () => {
    expect(parseTaskNotifications('<task-notification></task-notification>')).toEqual([
      { taskId: '', status: '', summary: '', outputFile: '' },
    ]);
  });

  it('parses multiple notifications in order', () => {
    const raw =
      '<task-notification><task-id>1</task-id></task-notification> x <task-notification><task-id>2</task-id></task-notification>';
    expect(parseTaskNotifications(raw).map((n) => n.taskId)).toEqual(['1', '2']);
  });
});
