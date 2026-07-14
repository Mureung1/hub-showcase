import { describe, expect, it } from 'vitest';
import { comparePassword, hashPassword } from './password.js';

describe('password hashing', () => {
  it('hashes and verifies a matching password', async () => {
    const hash = await hashPassword('secret123');
    expect(await comparePassword('secret123', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('secret123');
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});
