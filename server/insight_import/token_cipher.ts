import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type TokenCipherAad = {
  connectionId: string;
  provider: 'notion';
  userId: string;
};

export type EncryptedToken = {
  authTag: string;
  ciphertext: string;
  keyVersion: 1;
  nonce: string;
};

export type TokenCipher = {
  decrypt(encrypted: EncryptedToken, aad: TokenCipherAad): string;
  encrypt(token: string, aad: TokenCipherAad): EncryptedToken;
};

export function createTokenCipher(base64Key: string): TokenCipher {
  const key = Buffer.from(base64Key, 'base64');

  if (key.byteLength !== 32) {
    throw new Error('토큰 암호화 키가 올바르지 않습니다.');
  }

  return {
    decrypt(encrypted, aad) {
      try {
        const nonce = Buffer.from(encrypted.nonce, 'base64');
        const authTag = Buffer.from(encrypted.authTag, 'base64');

        if (nonce.byteLength !== 12 || authTag.byteLength !== 16) {
          throw new Error('invalid encrypted token');
        }

        const decipher = createDecipheriv('aes-256-gcm', key, nonce, {
          authTagLength: 16,
        });
        decipher.setAAD(serializeAad(aad));
        decipher.setAuthTag(authTag);

        return Buffer.concat([
          decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
          decipher.final(),
        ]).toString('utf8');
      } catch {
        throw new Error('토큰을 복호화하지 못했습니다.');
      }
    },

    encrypt(token, aad) {
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, nonce, {
        authTagLength: 16,
      });
      cipher.setAAD(serializeAad(aad));
      const ciphertext = Buffer.concat([
        cipher.update(token, 'utf8'),
        cipher.final(),
      ]);

      return {
        authTag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
        keyVersion: 1,
        nonce: nonce.toString('base64'),
      };
    },
  };
}

function serializeAad(aad: TokenCipherAad) {
  return Buffer.from(
    JSON.stringify({
      connectionId: aad.connectionId,
      provider: aad.provider,
      userId: aad.userId,
    })
  );
}
