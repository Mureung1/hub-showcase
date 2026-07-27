import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AiCredentialCipherError,
  createAiCredentialCipher,
} from '../src/lib/aiCredentialCipher.js'

const userA = '11111111-1111-4111-8111-111111111111'
const userB = '22222222-2222-4222-8222-222222222222'
const metadata = { userId: userA, provider: 'gemini', version: 1 }

test('AI credential cipher round-trips without returning the raw key in storage fields', () => {
  const cipher = createAiCredentialCipher(Buffer.alloc(32, 3))
  const apiKey = 'gemini-user-secret-key'
  const encrypted = cipher.encrypt(apiKey, metadata)

  assert.equal(encrypted.encryptionVersion, 1)
  assert.equal(encrypted.keyHint, '-key')
  assert.notEqual(encrypted.encryptedKey, apiKey)
  assert.equal(JSON.stringify(encrypted).includes(apiKey), false)
  assert.equal(cipher.decrypt(encrypted, metadata), apiKey)
})

test('AI credential encryption is randomized and bound to user and provider metadata', () => {
  const cipher = createAiCredentialCipher(Buffer.alloc(32, 4))
  const first = cipher.encrypt('same-secret', metadata)
  const second = cipher.encrypt('same-secret', metadata)

  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.encryptedKey, second.encryptedKey)
  assert.throws(
    () => cipher.decrypt(first, { ...metadata, userId: userB }),
    AiCredentialCipherError,
  )
  assert.throws(
    () => cipher.decrypt(first, { ...metadata, provider: 'other' }),
    AiCredentialCipherError,
  )
})

test('AI credential decryption rejects a wrong master key and malformed stored values', () => {
  const encrypted = createAiCredentialCipher(Buffer.alloc(32, 5))
    .encrypt('secret', metadata)

  assert.throws(
    () => createAiCredentialCipher(Buffer.alloc(32, 6)).decrypt(encrypted, metadata),
    AiCredentialCipherError,
  )
  assert.throws(
    () => createAiCredentialCipher(Buffer.alloc(32, 5)).decrypt({
      ...encrypted,
      authTag: 'not-base64',
    }, metadata),
    AiCredentialCipherError,
  )
})
