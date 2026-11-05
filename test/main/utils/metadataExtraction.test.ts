import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  extractCwd,
  extractFirstUserMessagePreview,
} from '../../../src/main/utils/metadataExtraction';

import type { FileSystemProvider } from '../../../src/main/services/infrastructure/FileSystemProvider';

const TS = '2026-01-01T00:00:00.000Z';

let tmpDir: string;
let fileCounter = 0;

function writeJsonl(lines: unknown[]): string {
  const filePath = path.join(tmpDir, `session-${fileCounter++}.jsonl`);
  const body = lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n');
  fs.writeFileSync(filePath, body);
  return filePath;
}

function userEntry(content: unknown, timestamp: string | null = TS): Record<string, unknown> {
  return {
    type: 'user',
    ...(timestamp !== null ? { timestamp } : {}),
    message: { role: 'user', content },
  };
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metadata-extraction-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('extractCwd', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('returns null when the file does not exist', async () => {
    expect(await extractCwd(path.join(tmpDir, 'missing.jsonl'))).toBeNull();
  });

  it('uses the injected provider and returns null when it reports the file missing', async () => {
    const provider = {
      exists: vi.fn().mockResolvedValue(false),
      createReadStream: vi.fn(),
    } as unknown as FileSystemProvider;

    expect(await extractCwd('/any/path.jsonl', provider)).toBeNull();
    expect(provider.exists).toHaveBeenCalledWith('/any/path.jsonl');
    expect(provider.createReadStream).not.toHaveBeenCalled();
  });

  it('returns cwd from the first entry that has one', async () => {
    const file = writeJsonl([
      { type: 'user', cwd: '/home/me/project', message: { role: 'user', content: 'x' } },
      { type: 'user', cwd: '/other' },
    ]);
    expect(await extractCwd(file)).toBe('/home/me/project');
  });

  it('skips blank lines, entries without cwd and entries with empty cwd', async () => {
    const file = writeJsonl([
      '',
      '   ',
      { type: 'summary', summary: 's' },
      { type: 'user', cwd: '' },
      { type: 'assistant', cwd: '/found' },
    ]);
    expect(await extractCwd(file)).toBe('/found');
  });

  it('returns null when no entry has cwd, or the file is empty', async () => {
    expect(await extractCwd(writeJsonl([{ type: 'summary' }, { type: 'user' }]))).toBeNull();
    expect(await extractCwd(writeJsonl([]))).toBeNull();
  });

  it('uppercases a lowercase Windows drive letter', async () => {
    const file = writeJsonl([{ type: 'user', cwd: 'c:\\Users\\me\\proj' }]);
    expect(await extractCwd(file)).toBe('C:\\Users\\me\\proj');
  });

  it('leaves single-character and POSIX paths unchanged', async () => {
    expect(await extractCwd(writeJsonl([{ type: 'user', cwd: 'c' }]))).toBe('c');
    expect(await extractCwd(writeJsonl([{ type: 'user', cwd: '/mnt/c/work' }]))).toBe(
      process.platform === 'win32' ? 'C:/work' : '/mnt/c/work'
    );
  });

  it('translates WSL mount paths to drive paths on win32', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const file = writeJsonl([{ type: 'user', cwd: '/mnt/d/work/repo' }]);
    expect(await extractCwd(file)).toBe('D:/work/repo');
  });

  it('skips malformed JSON lines and keeps scanning for cwd', async () => {
    const file = writeJsonl(['{not json', { type: 'user', cwd: '/after' }]);

    expect(await extractCwd(file)).toBe('/after');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs an error and returns null when the stream fails', async () => {
    const provider = {
      exists: vi.fn().mockResolvedValue(true),
      createReadStream: () =>
        new Readable({
          read() {
            this.destroy(new Error('read failed'));
          },
        }),
    } as unknown as FileSystemProvider;

    expect(await extractCwd('/broken.jsonl', provider)).toBeNull();
    const errorMock = vi.mocked(console.error);
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(errorMock.mock.calls[0][0]).toBe('[Util:metadataExtraction]');
    expect(errorMock.mock.calls[0][1]).toBe('Error extracting cwd from /broken.jsonl:');
    errorMock.mockClear(); // expected error; keep test/setup.ts assertion clean
  });
});

describe('extractFirstUserMessagePreview', () => {
  it('returns the first real user message text and timestamp', async () => {
    const file = writeJsonl([userEntry('hello world'), userEntry('second')]);
    expect(await extractFirstUserMessagePreview(file)).toEqual({
      text: 'hello world',
      timestamp: TS,
    });
  });

  it('skips non-user entries, blank lines and malformed JSON lines', async () => {
    const file = writeJsonl([
      { type: 'summary', summary: 's' },
      '',
      '{broken',
      { type: 'assistant', message: { role: 'assistant', content: 'no' } },
      userEntry('target'),
    ]);
    expect(await extractFirstUserMessagePreview(file)).toEqual({ text: 'target', timestamp: TS });
  });

  it('returns null for an empty file', async () => {
    expect(await extractFirstUserMessagePreview(writeJsonl([]))).toBeNull();
  });

  it('skips command output and interruption markers', async () => {
    const file = writeJsonl([
      userEntry('<local-command-stdout>out</local-command-stdout>'),
      userEntry('<local-command-stderr>err</local-command-stderr>'),
      userEntry('[Request interrupted by user]'),
      userEntry('after'),
    ]);
    expect((await extractFirstUserMessagePreview(file))?.text).toBe('after');
  });

  it('skips entries with no message, non-string/non-array content, or whitespace-only text', async () => {
    const file = writeJsonl([
      { type: 'user', timestamp: TS },
      userEntry({ text: 'object content' }),
      userEntry('   '),
      userEntry('ok'),
    ]);
    expect((await extractFirstUserMessagePreview(file))?.text).toBe('ok');
  });

  it('strips noise tags and skips messages that become empty', async () => {
    const file = writeJsonl([
      userEntry('<system-reminder>only noise</system-reminder>'),
      userEntry('<system-reminder>r</system-reminder>visible text'),
    ]);
    expect((await extractFirstUserMessagePreview(file))?.text).toBe('visible text');
  });

  it('prefers a later real message over an earlier slash command', async () => {
    const file = writeJsonl([
      userEntry('<command-name>/model</command-name><command-args>sonnet</command-args>', 'T1'),
      userEntry('real prompt', 'T2'),
    ]);
    expect(await extractFirstUserMessagePreview(file)).toEqual({
      text: 'real prompt',
      timestamp: 'T2',
    });
  });

  it('falls back to the first slash command when no real message exists', async () => {
    const file = writeJsonl([
      userEntry('<command-name>/model</command-name>', 'T1'),
      userEntry('<command-name>/clear</command-name>', 'T2'),
    ]);
    expect(await extractFirstUserMessagePreview(file)).toEqual({ text: '/model', timestamp: 'T1' });
  });

  it('uses "/command" when the command name has no leading slash', async () => {
    const file = writeJsonl([userEntry('<command-name>model</command-name>')]);
    expect((await extractFirstUserMessagePreview(file))?.text).toBe('/command');
  });

  it('joins text blocks of array content with a space and ignores non-text blocks', async () => {
    const file = writeJsonl([
      userEntry([
        { type: 'text', text: ' a ' },
        { type: 'tool_result', tool_use_id: 't1', content: 'ignored' },
        { type: 'text', text: 'b' },
      ]),
    ]);
    expect((await extractFirstUserMessagePreview(file))?.text).toBe('a  b');
  });

  it('skips array content with no text, interruption text, or noise-only text', async () => {
    const file = writeJsonl([
      userEntry([{ type: 'tool_result', tool_use_id: 't1', content: 'x' }]),
      userEntry([{ type: 'text', text: '[Request interrupted by user for tool use]' }]),
      userEntry([{ type: 'text', text: '<system-reminder>z</system-reminder>' }]),
      userEntry([{ type: 'text', text: 'array ok' }]),
    ]);
    expect((await extractFirstUserMessagePreview(file))?.text).toBe('array ok');
  });

  it('treats an array-content slash command as a command fallback', async () => {
    const file = writeJsonl([
      userEntry([{ type: 'text', text: '<command-name>/clear</command-name>' }]),
    ]);
    expect(await extractFirstUserMessagePreview(file)).toEqual({ text: '/clear', timestamp: TS });
  });

  it('truncates preview text to 500 characters (string and array content)', async () => {
    const long = 'x'.repeat(600);
    expect(
      (await extractFirstUserMessagePreview(writeJsonl([userEntry(long)])))?.text
    ).toHaveLength(500);
    const arrFile = writeJsonl([userEntry([{ type: 'text', text: long }])]);
    expect((await extractFirstUserMessagePreview(arrFile))?.text).toHaveLength(500);
  });

  it('uses the current time as timestamp when the entry has none', async () => {
    const before = Date.now();
    const result = await extractFirstUserMessagePreview(writeJsonl([userEntry('no ts', null)]));
    const after = Date.now();

    expect(result?.text).toBe('no ts');
    const parsed = Date.parse(result!.timestamp);
    expect(result!.timestamp).toBe(new Date(parsed).toISOString());
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it('stops after maxLines lines (blank lines count)', async () => {
    const file = writeJsonl(['', { type: 'assistant' }, userEntry('third line')]);
    expect(await extractFirstUserMessagePreview(file, undefined, 2)).toBeNull();
    expect((await extractFirstUserMessagePreview(file, undefined, 3))?.text).toBe('third line');
  });

  it('treats maxLines below 1 as 1', async () => {
    const file = writeJsonl([userEntry('first'), userEntry('second')]);
    expect((await extractFirstUserMessagePreview(file, undefined, 0))?.text).toBe('first');
    expect(
      await extractFirstUserMessagePreview(writeJsonl(['', userEntry('x')]), undefined, -5)
    ).toBeNull();
  });

  it('rejects when the file cannot be opened', async () => {
    await expect(
      extractFirstUserMessagePreview(path.join(tmpDir, 'missing.jsonl'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
