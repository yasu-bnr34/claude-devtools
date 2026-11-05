/**
 * Tests for src/main/ipc/validation.ts.
 *
 * `electron` is imported only as types there, so no module mock is needed:
 * a plain object stands in for IpcMain, and fs is exercised against a temp dir.
 * Symlink behavior is out of scope here (investigated in test/suspect/).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  registerValidationHandlers,
  removeValidationHandlers,
} from '../../../src/main/ipc/validation';

import type { IpcMain } from 'electron';

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>;

const handlers = new Map<string, Handler>();
const registered: string[] = [];
const removed: string[] = [];
const fakeIpcMain = {
  handle: (channel: string, fn: Handler) => {
    registered.push(channel);
    handlers.set(channel, fn);
  },
  removeHandler: (channel: string) => {
    removed.push(channel);
  },
};

function call(channel: string, ...args: unknown[]): Promise<unknown> {
  const fn = handlers.get(channel);
  if (!fn) throw new Error(`handler not registered: ${channel}`);
  return fn({}, ...args);
}

/** Return console calls of the given kind and clear them (test/setup.ts fails on leftovers). */
function takeConsole(kind: 'warn' | 'error'): unknown[][] {
  const mock = vi.mocked(console[kind]);
  const calls = [...mock.mock.calls];
  mock.mockClear();
  return calls;
}

let root: string;
let project: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'ipc-validation-'));
  project = path.join(root, 'proj');
  fs.mkdirSync(path.join(project, 'src'), { recursive: true });
  fs.writeFileSync(path.join(project, 'a.txt'), 'x');
  // Sibling directory sharing the "proj" prefix
  fs.mkdirSync(path.join(root, 'proj2'));
  fs.writeFileSync(path.join(root, 'proj2', 'f.txt'), 'x');

  registerValidationHandlers(fakeIpcMain as unknown as IpcMain);
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('register / remove', () => {
  it('registers the three validation channels', () => {
    expect(registered).toEqual(['validate-path', 'validate-mentions', 'session:scrollToLine']);
  });

  it('removes the same three channels', () => {
    removeValidationHandlers(fakeIpcMain as unknown as IpcMain);
    expect(removed).toEqual(['validate-path', 'validate-mentions', 'session:scrollToLine']);
  });
});

describe('validate-path', () => {
  it('reports an existing file as non-directory', async () => {
    expect(await call('validate-path', 'a.txt', project)).toEqual({
      exists: true,
      isDirectory: false,
    });
  });

  it('reports an existing directory', async () => {
    expect(await call('validate-path', 'src', project)).toEqual({
      exists: true,
      isDirectory: true,
    });
  });

  it('reports a missing path as not existing (no isDirectory)', async () => {
    expect(await call('validate-path', 'nope.txt', project)).toEqual({ exists: false });
  });

  it('accepts the project root itself and normalized in-project paths', async () => {
    expect(await call('validate-path', '', project)).toEqual({ exists: true, isDirectory: true });
    expect(await call('validate-path', './a.txt', project)).toEqual({
      exists: true,
      isDirectory: false,
    });
    expect(await call('validate-path', 'src/../a.txt', project)).toEqual({
      exists: true,
      isDirectory: false,
    });
  });

  it('joins a leading-slash path under the project instead of treating it as absolute', async () => {
    expect(await call('validate-path', '/a.txt', project)).toEqual({
      exists: true,
      isDirectory: false,
    });
  });

  it('blocks traversal into a sibling directory sharing the name prefix and warns', async () => {
    expect(await call('validate-path', '../proj2/f.txt', project)).toEqual({ exists: false });
    expect(takeConsole('warn')).toEqual([
      ['[IPC:validation]', 'validate-path blocked path traversal attempt:', '../proj2/f.txt'],
    ]);
  });

  it('returns exists:false when path arguments are invalid (caught error)', async () => {
    expect(await call('validate-path', 'a.txt', undefined)).toEqual({ exists: false });
  });

  it('accepts in-project paths when projectPath has a trailing separator', async () => {
    expect(await call('validate-path', 'a.txt', project + path.sep)).toEqual({
      exists: true,
      isDirectory: false,
    });
    expect(await call('validate-path', '', project + path.sep)).toEqual({
      exists: true,
      isDirectory: true,
    });
    expect(takeConsole('warn')).toEqual([]);
  });

  it('still blocks traversal when projectPath has a trailing separator', async () => {
    expect(await call('validate-path', '../proj2/f.txt', project + path.sep)).toEqual({
      exists: false,
    });
    expect(takeConsole('warn')).toHaveLength(1);
  });
});

describe('validate-mentions', () => {
  it('maps each mention to "@value" -> exists, blocking traversal silently', async () => {
    const result = await call(
      'validate-mentions',
      [
        { type: 'path', value: 'a.txt' },
        { type: 'path', value: 'nope' },
        { type: 'path', value: '../proj2/f.txt' },
        { type: 'path', value: 'src' },
      ],
      project
    );
    expect(result).toEqual({
      '@a.txt': true,
      '@nope': false,
      '@../proj2/f.txt': false,
      '@src': true,
    });
    expect(takeConsole('warn')).toEqual([]);
  });

  it('collapses duplicate mentions into one key', async () => {
    const result = await call(
      'validate-mentions',
      [
        { type: 'path', value: 'a.txt' },
        { type: 'path', value: 'a.txt' },
      ],
      project
    );
    expect(result).toEqual({ '@a.txt': true });
  });

  it('returns an empty object for no mentions', async () => {
    expect(await call('validate-mentions', [], project)).toEqual({});
  });
});

describe('session:scrollToLine', () => {
  it('returns success for a valid sessionId and line number (including 0)', async () => {
    expect(await call('session:scrollToLine', 's1', 5)).toEqual({
      success: true,
      sessionId: 's1',
      lineNumber: 5,
    });
    expect(await call('session:scrollToLine', 's1', 0)).toEqual({
      success: true,
      sessionId: 's1',
      lineNumber: 0,
    });
  });

  it('rejects an empty or missing sessionId and logs an error', async () => {
    const expected = { success: false, sessionId: '', lineNumber: 0 };
    expect(await call('session:scrollToLine', '', 5)).toEqual(expected);
    expect(await call('session:scrollToLine', undefined, 5)).toEqual(expected);
    expect(takeConsole('error')).toEqual([
      ['[IPC:validation]', 'session:scrollToLine called with empty sessionId'],
      ['[IPC:validation]', 'session:scrollToLine called with empty sessionId'],
    ]);
  });

  it('rejects a negative line number, keeping the sessionId', async () => {
    expect(await call('session:scrollToLine', 's1', -1)).toEqual({
      success: false,
      sessionId: 's1',
      lineNumber: 0,
    });
    expect(takeConsole('error')).toEqual([
      ['[IPC:validation]', 'session:scrollToLine called with invalid lineNumber'],
    ]);
  });

  it('rejects a non-number line number', async () => {
    expect(await call('session:scrollToLine', 's1', '5')).toEqual({
      success: false,
      sessionId: 's1',
      lineNumber: 0,
    });
    expect(takeConsole('error')).toHaveLength(1);
  });

  it.each([Number.NaN, 1.5, Number.POSITIVE_INFINITY])(
    'rejects a non-integer line number (%s)',
    async (lineNumber) => {
      expect(await call('session:scrollToLine', 's1', lineNumber)).toEqual({
        success: false,
        sessionId: 's1',
        lineNumber: 0,
      });
      expect(takeConsole('error')).toEqual([
        ['[IPC:validation]', 'session:scrollToLine called with invalid lineNumber'],
      ]);
    }
  );
});
