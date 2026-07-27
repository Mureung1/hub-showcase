import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16
const BASE64_PATTERN = /^[a-z0-9+/]+={0,2}$/i

export class AiCredentialCipherError extends Error {
  constructor() {
    super('저장된 AI API 키를 복호화할 수 없습니다.')
    this.name = 'AiCredentialCipherError'
  }
}

function associatedData({ userId, provider, version }) {
  if (!userId || !provider || !Number.isInteger(version)) {
    throw new AiCredentialCipherError()
  }
  return Buffer.from(`${userId}:${provider}:${version}`, 'utf8')
}

function decodeStoredBase64(value, expectedBytes = null) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length % 4 !== 0
    || !BASE64_PATTERN.test(value)
  ) {
    throw new AiCredentialCipherError()
  }
  const decoded = Buffer.from(value, 'base64')
  if (
    decoded.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')
    || (expectedBytes !== null && decoded.length !== expectedBytes)
  ) {
    throw new AiCredentialCipherError()
  }
  return decoded
}

export function createAiCredentialCipher(masterKey) {
  const key = Buffer.from(masterKey ?? [])
  if (key.length !== 32) {
    throw new Error('AI credential 암호화 키는 32바이트여야 합니다.')
  }

  return {
    encrypt(apiKey, {
      userId,
      provider,
      version = 1,
    }) {
      if (typeof apiKey !== 'string' || apiKey.length === 0) {
        throw new AiCredentialCipherError()
      }
      const iv = randomBytes(IV_BYTES)
      const cipher = createCipheriv(ALGORITHM, key, iv)
      cipher.setAAD(associatedData({ userId, provider, version }))
      const encrypted = Buffer.concat([
        cipher.update(apiKey, 'utf8'),
        cipher.final(),
      ])

      return {
        encryptedKey: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        encryptionVersion: version,
        keyHint: apiKey.slice(-4),
      }
    },
    decrypt(stored, {
      userId,
      provider,
      version = stored?.encryptionVersion,
    }) {
      try {
        const iv = decodeStoredBase64(stored?.iv, IV_BYTES)
        const authTag = decodeStoredBase64(stored?.authTag, AUTH_TAG_BYTES)
        const encrypted = decodeStoredBase64(stored?.encryptedKey)
        const decipher = createDecipheriv(ALGORITHM, key, iv)
        decipher.setAAD(associatedData({ userId, provider, version }))
        decipher.setAuthTag(authTag)
        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final(),
        ]).toString('utf8')
      } catch (error) {
        if (error instanceof AiCredentialCipherError) throw error
        throw new AiCredentialCipherError()
      }
    },
  }
}
