import { describe, expect, it } from 'vitest';

import {
  getTrafficLightPaddingForZoom,
  getTrafficLightPositionForZoom,
  HEADER_ROW1_HEIGHT,
  WINDOW_ZOOM_FACTOR_CHANGED_CHANNEL,
} from '../../../src/shared/constants/trafficLights';

describe('trafficLights constants', () => {
  it('exports the zoom-change IPC channel and header row height', () => {
    expect(WINDOW_ZOOM_FACTOR_CHANGED_CHANNEL).toBe('window:zoom-factor-changed');
    expect(HEADER_ROW1_HEIGHT).toBe(40);
  });
});

describe('getTrafficLightPositionForZoom', () => {
  it('returns the base position {12, 12} at 100% zoom', () => {
    // y = (40 - 16) / 2 = 12
    expect(getTrafficLightPositionForZoom(1)).toEqual({ x: 12, y: 12 });
  });

  it('scales x linearly and re-centers y in the zoomed header row', () => {
    expect(getTrafficLightPositionForZoom(2)).toEqual({ x: 24, y: 32 });
    expect(getTrafficLightPositionForZoom(3)).toEqual({ x: 36, y: 52 });
    expect(getTrafficLightPositionForZoom(0.5)).toEqual({ x: 6, y: 2 });
  });

  it('rounds fractional results', () => {
    // x = 12 * 1.5 = 18, y = (60 - 16) / 2 = 22
    expect(getTrafficLightPositionForZoom(1.5)).toEqual({ x: 18, y: 22 });
    // x = round(4.8) = 5, y = (16 - 16) / 2 = 0
    expect(getTrafficLightPositionForZoom(0.4)).toEqual({ x: 5, y: 0 });
  });

  it('clamps zoom below the 0.25 minimum to 0.25', () => {
    const atMin = getTrafficLightPositionForZoom(0.25);
    expect(atMin).toEqual({ x: 3, y: -3 });
    expect(getTrafficLightPositionForZoom(0.1)).toEqual(atMin);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'falls back to zoom 1 for non-finite or non-positive zoom (%s)',
    (zoom) => {
      expect(getTrafficLightPositionForZoom(zoom)).toEqual({ x: 12, y: 12 });
    }
  );
});

describe('getTrafficLightPaddingForZoom', () => {
  it('returns 12 + (52 + 16) = 80 at 100% zoom', () => {
    expect(getTrafficLightPaddingForZoom(1)).toBe(80);
  });

  it('shrinks the CSS padding as zoom grows (ceil of 12 + 68 / zoom)', () => {
    expect(getTrafficLightPaddingForZoom(2)).toBe(46);
    expect(getTrafficLightPaddingForZoom(1.5)).toBe(58); // 57.33 -> 58
    expect(getTrafficLightPaddingForZoom(3)).toBe(35); // 34.67 -> 35
  });

  it('grows the CSS padding as zoom shrinks, clamped at zoom 0.25', () => {
    expect(getTrafficLightPaddingForZoom(0.5)).toBe(148);
    expect(getTrafficLightPaddingForZoom(0.25)).toBe(284);
    expect(getTrafficLightPaddingForZoom(0.1)).toBe(284);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to zoom 1 for invalid zoom (%s)',
    (zoom) => {
      expect(getTrafficLightPaddingForZoom(zoom)).toBe(80);
    }
  );
});
