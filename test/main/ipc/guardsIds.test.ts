import { describe, expect, it } from 'vitest';

import {
  coercePageLimit,
  coerceSearchMaxResults,
  validateNotificationId,
  validateSearchQuery,
  validateSessionId,
  validateSubagentId,
  validateTriggerId,
} from '../../../src/main/ipc/guards';

const idValidators = [
  ['validateSessionId', validateSessionId, 'sessionId'],
  ['validateSubagentId', validateSubagentId, 'subagentId'],
  ['validateNotificationId', validateNotificationId, 'notificationId'],
  ['validateTriggerId', validateTriggerId, 'triggerId'],
] as const;

describe.each(idValidators)('%s', (_name, validate, field) => {
  it('accepts alphanumerics with . _ - and trims whitespace', () => {
    expect(validate('  abc-123_x.y  ')).toEqual({ valid: true, value: 'abc-123_x.y' });
  });

  it('rejects non-string input mentioning the field name', () => {
    for (const bad of [undefined, null, 42, {}, []]) {
      const r = validate(bad);
      expect(r.valid).toBe(false);
      expect(r.error).toContain(field);
    }
  });

  it('rejects empty / whitespace-only input', () => {
    expect(validate('').valid).toBe(false);
    expect(validate('   ').valid).toBe(false);
  });

  it('rejects path traversal and separators', () => {
    expect(validate('../etc/passwd').valid).toBe(false);
    expect(validate('a/b').valid).toBe(false);
    expect(validate('a\\b').valid).toBe(false);
  });

  it('rejects ids starting with a non-alphanumeric character', () => {
    expect(validate('-abc').valid).toBe(false);
    expect(validate('.hidden').valid).toBe(false);
  });

  it('rejects ids longer than 128 chars but accepts exactly 128', () => {
    expect(validate('a'.repeat(128)).valid).toBe(true);
    expect(validate('a'.repeat(129)).valid).toBe(false);
  });
});

describe('validateSearchQuery', () => {
  it('trims and returns the query', () => {
    expect(validateSearchQuery('  foo bar ')).toEqual({ valid: true, value: 'foo bar' });
  });

  it('rejects non-strings and empty queries', () => {
    expect(validateSearchQuery(123).valid).toBe(false);
    expect(validateSearchQuery('   ').valid).toBe(false);
  });

  it('allows up to 512 chars and rejects more', () => {
    expect(validateSearchQuery('q'.repeat(512)).valid).toBe(true);
    expect(validateSearchQuery('q'.repeat(513)).valid).toBe(false);
  });
});

describe('limit coercion', () => {
  it.each([
    ['coerceSearchMaxResults', coerceSearchMaxResults, 50, 200],
    ['coercePageLimit', coercePageLimit, 20, 200],
  ] as const)('%s uses default for invalid values', (_n, fn, def) => {
    expect(fn(undefined)).toBe(def);
    expect(fn('10')).toBe(def);
    expect(fn(NaN)).toBe(def);
    expect(fn(Infinity)).toBe(def);
    expect(fn(0)).toBe(def);
    expect(fn(-5)).toBe(def);
    expect(fn(0.5)).toBe(def);
  });

  it('floors fractional values and caps at the maximum', () => {
    expect(coerceSearchMaxResults(7.9)).toBe(7);
    expect(coerceSearchMaxResults(10_000)).toBe(200);
    expect(coercePageLimit(3.2)).toBe(3);
    expect(coercePageLimit(10_000)).toBe(200);
  });

  it('honours a custom default', () => {
    expect(coerceSearchMaxResults(undefined, 5)).toBe(5);
    expect(coercePageLimit(null, 9)).toBe(9);
  });
});
