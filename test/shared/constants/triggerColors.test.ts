/**
 * Basic behavior of the trigger color palette.
 * Edge cases of custom hex validation (digit counts, alpha concatenation) are
 * investigated separately in test/suspect/triggerColorsHex.test.ts and are not covered here.
 */
import { describe, expect, it } from 'vitest';

import {
  getHighlightProps,
  getToolHighlightProps,
  getTriggerColorDef,
  HIGHLIGHT_CLASSES,
  isPresetColorKey,
  resolveColorHex,
  TOOL_HIGHLIGHT_CLASSES,
  TRIGGER_COLORS,
  type TriggerColor,
} from '../../../src/shared/constants/triggerColors';

const PRESET_KEYS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan'];
const RED = { key: 'red', label: 'Red', hex: '#ef4444' };

describe('TRIGGER_COLORS palette', () => {
  it('has the 8 preset keys in display order', () => {
    expect(TRIGGER_COLORS.map((c) => c.key)).toEqual(PRESET_KEYS);
  });

  it('uses capitalized labels and 6-digit hex values', () => {
    for (const c of TRIGGER_COLORS) {
      expect(c.label).toBe(c.key[0].toUpperCase() + c.key.slice(1));
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('has highlight classes for every preset key', () => {
    expect(Object.keys(HIGHLIGHT_CLASSES).sort()).toEqual([...PRESET_KEYS].sort());
    expect(Object.keys(TOOL_HIGHLIGHT_CLASSES).sort()).toEqual([...PRESET_KEYS].sort());
  });
});

describe('isPresetColorKey', () => {
  it.each(PRESET_KEYS)('returns true for preset key "%s"', (key) => {
    expect(isPresetColorKey(key)).toBe(true);
  });

  it('returns false for undefined, empty, wrong case, hex and Object.prototype keys', () => {
    expect(isPresetColorKey(undefined)).toBe(false);
    expect(isPresetColorKey('')).toBe(false);
    expect(isPresetColorKey('Red')).toBe(false);
    expect(isPresetColorKey('#ef4444')).toBe(false);
    expect(isPresetColorKey('constructor')).toBe(false);
  });
});

describe('getTriggerColorDef / resolveColorHex', () => {
  it('defaults to red when color is undefined or empty', () => {
    expect(getTriggerColorDef(undefined)).toEqual(RED);
    expect(getTriggerColorDef('' as TriggerColor)).toEqual(RED);
    expect(resolveColorHex(undefined)).toBe('#ef4444');
  });

  it('returns the preset definition for a preset key', () => {
    expect(getTriggerColorDef('blue')).toEqual({ key: 'blue', label: 'Blue', hex: '#3b82f6' });
    expect(resolveColorHex('cyan')).toBe('#06b6d4');
  });

  it('returns a synthetic def for a 6-digit custom hex', () => {
    expect(getTriggerColorDef('#ff6600')).toEqual({
      key: '#ff6600',
      label: '#ff6600',
      hex: '#ff6600',
    });
    expect(resolveColorHex('#ff6600')).toBe('#ff6600');
  });

  it('falls back to red for unknown names and non-hex strings', () => {
    expect(getTriggerColorDef('magenta' as TriggerColor)).toEqual(RED);
    expect(getTriggerColorDef('#ggg')).toEqual(RED);
  });
});

describe('getHighlightProps', () => {
  it('returns the red preset class (no style) when color is undefined', () => {
    expect(getHighlightProps(undefined)).toEqual({ className: HIGHLIGHT_CLASSES.red });
  });

  it('returns the preset class for a preset key', () => {
    expect(getHighlightProps('green')).toEqual({
      className: 'ring-2 ring-green-500/30 bg-green-500/5',
    });
  });

  it('returns inline style with 30%/5% alpha suffixes for a custom hex', () => {
    expect(getHighlightProps('#ff6600')).toEqual({
      className: 'ring-2',
      style: { boxShadow: '0 0 0 2px #ff66004D', backgroundColor: '#ff66000D' },
    });
  });

  it('falls back to the red preset class for empty, unknown or invalid hex color', () => {
    const expected = { className: HIGHLIGHT_CLASSES.red };
    expect(getHighlightProps('' as TriggerColor)).toEqual(expected);
    expect(getHighlightProps('magenta' as TriggerColor)).toEqual(expected);
    expect(getHighlightProps('#ggg')).toEqual(expected);
  });
});

describe('getToolHighlightProps', () => {
  it('returns the red pulsing preset class when color is undefined', () => {
    expect(getToolHighlightProps(undefined)).toEqual({
      className: 'ring-2 ring-red-500 bg-red-500/10 animate-pulse',
    });
  });

  it('returns the preset class for a preset key', () => {
    expect(getToolHighlightProps('purple')).toEqual({ className: TOOL_HIGHLIGHT_CLASSES.purple });
  });

  it('returns pulsing inline style (solid ring, 10% bg) for a custom hex', () => {
    expect(getToolHighlightProps('#ff6600')).toEqual({
      className: 'ring-2 animate-pulse',
      style: { boxShadow: '0 0 0 2px #ff6600', backgroundColor: '#ff66001A' },
    });
  });

  it('falls back to the red preset class for empty, unknown or invalid hex color', () => {
    const expected = { className: TOOL_HIGHLIGHT_CLASSES.red };
    expect(getToolHighlightProps('' as TriggerColor)).toEqual(expected);
    expect(getToolHighlightProps('magenta' as TriggerColor)).toEqual(expected);
    expect(getToolHighlightProps('#ggg')).toEqual(expected);
  });
});
