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
  isValidHexColor,
  resolveColorHex,
  type TriggerColor,
} from '../../src/shared/constants/triggerColors';

/** CSS Color 4 の hex 記法で有効な桁数は 3/4/6/8 のみ */
const CSS_HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

describe('suspect#2 triggerColors: custom hex handling', () => {
  // 修正済み: 5桁・7桁（CSS では無効）は受理せず既定色（red）に戻す
  it('H-a: 5- and 7-digit hex are rejected and fall back to red', () => {
    expect(getTriggerColorDef('#12345')).toEqual({ key: 'red', label: 'Red', hex: '#ef4444' });
    expect(resolveColorHex('#1234567')).toBe('#ef4444');
    expect(isValidHexColor('#12345')).toBe(false);
    expect(isValidHexColor('#1234567')).toBe(false);
    for (const ok of ['#f60', '#f60a', '#ff6600', '#ff6600ff'])
      expect(isValidHexColor(ok)).toBe(true);
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

  // 修正済み: 3桁 hex は 6桁に展開してから alpha を付ける
  it('H-d: 3-digit hex is expanded before appending alpha', () => {
    const { style } = getHighlightProps('#f60');
    expect(style).toEqual({ boxShadow: '0 0 0 2px #ff66004D', backgroundColor: '#ff66000D' });

    const tool = getToolHighlightProps('#f60');
    expect(tool.style).toEqual({ boxShadow: '0 0 0 2px #f60', backgroundColor: '#ff66001A' });
  });

  // 修正済み: 4桁・8桁（alpha 付き）は元の alpha を置き換える
  it('H-e: 4- and 8-digit hex have their alpha replaced', () => {
    expect(getHighlightProps('#ff6600ff').style?.backgroundColor).toBe('#ff66000D');
    expect(getHighlightProps('#f60a').style?.backgroundColor).toBe('#ff66000D');
  });

  it('H-g: every accepted custom hex yields valid CSS hex in highlight styles', () => {
    for (const c of ['#f60', '#F60A', '#ff6600', '#ff6600ff'] as TriggerColor[]) {
      const bg = [
        getHighlightProps(c).style?.backgroundColor,
        getToolHighlightProps(c).style?.backgroundColor,
      ];
      for (const v of bg) expect(CSS_HEX_RE.test(v ?? '')).toBe(true);
    }
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
