import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from './jwt.js';

describe('jwt', () => {
  it('signs and verifies a token', () => {
    const token = signToken({ userId: 'user-1' });
    const payload = verifyToken(token);
    expect(payload.userId).toBe('user-1');
  });

  it('throws on invalid token', () => {
    expect(() => verifyToken('invalid.token.value')).toThrow();
  });
});
