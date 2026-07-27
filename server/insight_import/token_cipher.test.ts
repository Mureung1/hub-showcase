import { describe, expect, it } from 'vitest';

import { createTokenCipher } from './token_cipher';

const CONNECTION_ID = '10000000-0000-4000-8000-000000000001';
const USER_ID = '20000000-0000-4000-8000-000000000001';
const aad = {
  connectionId: CONNECTION_ID,
  provider: 'notion' as const,
  userId: USER_ID,
};

describe('token cipher', () => {
  it('AAD에 묶인 토큰을 AES-256-GCM으로 암복호화한다', () => {
    const cipher = createTokenCipher(Buffer.alloc(32, 3).toString('base64'));
    const encrypted = cipher.encrypt('secret-token', aad);

    expect(encrypted).toMatchObject({ keyVersion: 1 });
    expect(encrypted.ciphertext).not.toContain('secret-token');
    expect(cipher.decrypt(encrypted, aad)).toBe('secret-token');
    expect(() =>
      cipher.decrypt(encrypted, {
        ...aad,
        userId: '30000000-0000-4000-8000-000000000001',
      })
    ).toThrow('토큰을 복호화하지 못했습니다.');
  });

  it('같은 평문도 매번 다른 nonce와 ciphertext로 암호화한다', () => {
    const cipher = createTokenCipher(Buffer.alloc(32, 4).toString('base64'));
    const first = cipher.encrypt('secret-token', aad);
    const second = cipher.encrypt('secret-token', aad);

    expect(second.nonce).not.toBe(first.nonce);
    expect(second.ciphertext).not.toBe(first.ciphertext);
  });

  it.each([31, 33])('%i byte key를 거부한다', (byteLength) => {
    expect(() =>
      createTokenCipher(Buffer.alloc(byteLength).toString('base64'))
    ).toThrow('토큰 암호화 키가 올바르지 않습니다.');
  });

  it.each(['ciphertext', 'authTag'] as const)(
    '변조된 %s를 복호화하지 않는다',
    (field) => {
      const cipher = createTokenCipher(Buffer.alloc(32, 5).toString('base64'));
      const encrypted = cipher.encrypt('secret-token', aad);

      expect(() =>
        cipher.decrypt(
          {
            ...encrypted,
            [field]: Buffer.from('tampered').toString('base64'),
          },
          aad
        )
      ).toThrow('토큰을 복호화하지 못했습니다.');
    }
  );
});
