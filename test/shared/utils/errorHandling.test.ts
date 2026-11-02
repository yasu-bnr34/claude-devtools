import { describe, expect, it } from 'vitest';

import { getErrorMessage } from '../../../src/shared/utils/errorHandling';

describe('getErrorMessage', () => {
  it('returns message of an Error instance', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns message of Error subclasses', () => {
    expect(getErrorMessage(new TypeError('bad type'))).toBe('bad type');
  });

  it('returns strings as-is', () => {
    expect(getErrorMessage('plain failure')).toBe('plain failure');
  });

  it('returns empty string as-is', () => {
    expect(getErrorMessage('')).toBe('');
  });

  it('extracts message from error-like plain objects', () => {
    expect(getErrorMessage({ message: 'from object' })).toBe('from object');
  });

  it('stringifies non-string message properties', () => {
    expect(getErrorMessage({ message: 404 })).toBe('404');
  });

  it('stringifies null and undefined', () => {
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('stringifies numbers', () => {
    expect(getErrorMessage(42)).toBe('42');
  });

  it('does not throw for objects without message', () => {
    expect(typeof getErrorMessage({ code: 'E1' })).toBe('string');
  });
});
