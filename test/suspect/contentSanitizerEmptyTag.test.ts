/**
 * 疑わしい挙動 #1: contentSanitizer の空タグの扱い（再現テスト）
 *
 * 期待値は現行コードの観測値。仕様の推測ではない。判定は SUSPECT_NOTES.md を参照。
 */
import { describe, expect, it } from 'vitest';

import {
  extractSlashInfo,
  parseTaskNotifications,
  sanitizeDisplayContent,
} from '../../src/shared/utils/contentSanitizer';
import { isParsedHardNoiseMessage } from '../../src/main/types/messages';
import type { ParsedMessage } from '../../src/main/types';

function userMsg(content: string): ParsedMessage {
  return {
    uuid: 'u1',
    parentUuid: null,
    type: 'user',
    timestamp: new Date('2026-01-01T00:00:00Z'),
    content,
    isMeta: false,
    isSidechain: false,
    toolCalls: [],
    toolResults: [],
  } as unknown as ParsedMessage;
}

describe('suspect#1 contentSanitizer: empty tags', () => {
  // 現在の挙動（要確認）: 空の stdout はタグ除去されず、生の XML がそのまま返る
  it('S1-a: empty <local-command-stdout> is returned as raw XML', () => {
    const raw = '<local-command-stdout></local-command-stdout>';
    expect(sanitizeDisplayContent(raw)).toBe(raw);
  });

  // 現在の挙動（要確認）: 空白のみの stdout も生の XML（trim 後の内容が空のため）
  it('S1-b: whitespace-only <local-command-stdout> is returned as raw XML (trimmed)', () => {
    expect(sanitizeDisplayContent('<local-command-stdout>  \n </local-command-stdout>')).toBe(
      '<local-command-stdout>  \n </local-command-stdout>'
    );
  });

  // 現在の挙動（要確認）: 空 stdout + 非空 stderr のとき stderr は採用されず生 XML が返る
  it('S1-c: empty stdout followed by non-empty stderr returns raw XML, stderr not extracted', () => {
    const raw =
      '<local-command-stdout></local-command-stdout><local-command-stderr>oops</local-command-stderr>';
    expect(sanitizeDisplayContent(raw)).toBe(raw);
  });

  it('S1-d: empty stderr is returned as raw XML', () => {
    const raw = '<local-command-stderr></local-command-stderr>';
    expect(sanitizeDisplayContent(raw)).toBe(raw);
  });

  it('S1-e: empty <command-name> yields empty string (tags stripped)', () => {
    expect(sanitizeDisplayContent('<command-name></command-name>')).toBe('');
    expect(sanitizeDisplayContent('<command-name>/</command-name>')).toBe('');
  });

  it('S1-f: empty <command-args> yields the command without trailing space', () => {
    expect(
      sanitizeDisplayContent('<command-name>/clear</command-name><command-args></command-args>')
    ).toBe('/clear');
  });

  it('S1-g: empty <command-message> becomes "" (not undefined) in extractSlashInfo', () => {
    expect(
      extractSlashInfo(
        '<command-name>/x</command-name><command-message></command-message><command-args></command-args>'
      )
    ).toEqual({ name: 'x', message: '', args: '' });
  });

  it('S1-h: empty <task-notification> yields one all-empty entry', () => {
    expect(parseTaskNotifications('<task-notification></task-notification>')).toEqual([
      { taskId: '', status: '', summary: '', outputFile: '' },
    ]);
  });

  // 上流フィルタの観測: 完全一致の空 stdout/stderr は hard noise として表示前に除外される
  it('S1-i: exact empty stdout/stderr is hard noise; whitespace-only stdout is not', () => {
    expect(isParsedHardNoiseMessage(userMsg('<local-command-stdout></local-command-stdout>'))).toBe(
      true
    );
    expect(isParsedHardNoiseMessage(userMsg('<local-command-stderr></local-command-stderr>'))).toBe(
      true
    );
    expect(isParsedHardNoiseMessage(userMsg('<local-command-stdout> </local-command-stdout>'))).toBe(
      false
    );
  });
});
