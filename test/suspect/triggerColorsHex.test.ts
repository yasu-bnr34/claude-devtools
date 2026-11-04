/**
 * 疑わしい挙動 #2: hex 色の扱い（再現テスト）
 *
 * 対象: src/shared/constants/triggerColors.ts
 * 期待値は現行コードの観測値。判定は SUSPECT_NOTES.md を参照。
 */
import { describe, expect, it } from 'vitest';

import {
  getHighlightProps,
  getToolHighlightProps,
  getTriggerColorDef,
  resolveColorHex,
  type TriggerColor,
} from '../../src/shared/constants/triggerColors';

/** CSS Color 4 の hex 記法で有効な桁数は 3/4/6/8 のみ */
const CSS_HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

describe('suspect#2 triggerColors: custom hex handling', () => {
  // 現在の挙動（要確認）: 5桁・7桁（CSS では無効）も custom hex として受理される
  it('H-a: 5- and 7-digit hex are accepted as custom colors', () => {
    expect(getTriggerColorDef('#12345')).toEqual({ key: '#12345', label: '#12345', hex: '#12345' });
    expect(resolveColorHex('#1234567')).toBe('#1234567');
    expect(CSS_HEX_RE.test('#12345')).toBe(false);
    expect(CSS_HEX_RE.test('#1234567')).toBe(false);
  });

  it('H-b: non-hex custom value falls back to red', () => {
    expect(resolveColorHex('#zzz' as TriggerColor)).toBe('#ef4444');
    expect(resolveColorHex('#12' as TriggerColor)).toBe('#ef4444');
  });

  it('H-c: 6-digit hex produces valid 8-digit alpha colors', () => {
    const { className, style } = getHighlightProps('#ff6600');
    expect(className).toBe('ring-2');
    expect(style).toEqual({ boxShadow: '0 0 0 2px #ff66004D', backgroundColor: '#ff66000D' });
    expect(CSS_HEX_RE.test('#ff66004D')).toBe(true);
  });

  // 現在の挙動（要確認）: 3桁 hex に alpha 2桁を連結し、CSS として無効な 5桁 hex になる
  it('H-d: 3-digit hex + alpha suffix produces invalid 5-digit CSS hex', () => {
    const { style } = getHighlightProps('#f60');
    expect(style).toEqual({ boxShadow: '0 0 0 2px #f604D', backgroundColor: '#f600D' });
    expect(CSS_HEX_RE.test('#f600D')).toBe(false);

    const tool = getToolHighlightProps('#f60');
    expect(tool.style).toEqual({ boxShadow: '0 0 0 2px #f60', backgroundColor: '#f601A' });
    expect(CSS_HEX_RE.test('#f601A')).toBe(false);
  });

  // 現在の挙動（要確認）: 8桁 hex（alpha 付き）に更に alpha を連結し 10桁になる
  it('H-e: 8-digit hex + alpha suffix produces invalid 10-digit CSS hex', () => {
    const { style } = getHighlightProps('#ff6600ff');
    expect(style?.backgroundColor).toBe('#ff6600ff0D');
    expect(CSS_HEX_RE.test('#ff6600ff0D')).toBe(false);
  });

  it('H-f: DOM (happy-dom) drops the invalid background color from H-d', () => {
    const valid = document.createElement('div');
    valid.style.backgroundColor = '#ff66000D';
    const invalid = document.createElement('div');
    invalid.style.backgroundColor = '#f600D';
    expect(valid.style.backgroundColor).not.toBe('');
    expect(invalid.style.backgroundColor).toBe('');
  });
});
