import { describe, expect, it } from 'vitest';
import { formatAuthError, isDuplicateSignup, providerLabel } from './authHelpers';

describe('isDuplicateSignup', () => {
  it('returns true when identities are empty', () => {
    expect(
      isDuplicateSignup({
        id: '1',
        identities: [],
      } as never),
    ).toBe(true);
  });

  it('returns false for a new email signup', () => {
    expect(
      isDuplicateSignup({
        id: '1',
        identities: [{ provider: 'email' }],
      } as never),
    ).toBe(false);
  });
});

describe('formatAuthError', () => {
  it('translates invalid login credentials', () => {
    expect(formatAuthError('Invalid login credentials')).toContain('Google');
  });

  it('passes through unknown messages', () => {
    expect(formatAuthError('Custom error')).toBe('Custom error');
  });
});

describe('providerLabel', () => {
  it('maps known providers', () => {
    expect(providerLabel('google')).toBe('Google');
    expect(providerLabel('email')).toBe('이메일/비밀번호');
  });
});
