/**
 * 候補 #4（報告との対応は不明・今回の走査で発見）: teammate-message 属性値中の '>'（再現テスト）
 *
 * 対象: src/shared/utils/teammateMessageParser.ts
 * 期待値は現行コードの観測値。判定は SUSPECT_NOTES.md を参照。
 */
import { describe, expect, it } from 'vitest';

import { parseAllTeammateMessages } from '../../src/shared/utils/teammateMessageParser';

describe('suspect#4 teammateMessageParser: ">" inside attribute value', () => {
  it('T-a: control — summary without ">" parses normally', () => {
    expect(
      parseAllTeammateMessages(
        '<teammate-message teammate_id="alice" color="blue" summary="A to B">body</teammate-message>'
      )
    ).toEqual([{ teammateId: 'alice', color: 'blue', summary: 'A to B', content: 'body' }]);
  });

  // 現在の挙動（要確認）: summary に '>' があると summary が空になり、残りが content に混入する
  it('T-b: summary containing ">" is lost and leaks into content', () => {
    expect(
      parseAllTeammateMessages(
        '<teammate-message teammate_id="alice" color="blue" summary="A -> B">body</teammate-message>'
      )
    ).toEqual([{ teammateId: 'alice', color: 'blue', summary: '', content: 'B">body' }]);
  });
});
