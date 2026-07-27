import assert from 'node:assert/strict'
import test from 'node:test'

import { readAiRuntimeConfig } from '../src/lib/aiConfig.js'

const masterKey = Buffer.alloc(32, 7).toString('base64')

test('AI runtime config keeps Mock explicit and does not require an encryption key', () => {
  assert.deepEqual(readAiRuntimeConfig({
    TEAMFLOW_AI_PROVIDER: 'mock',
  }), {
    mode: 'mock',
    provider: null,
    model: 'gemini-3.5-flash',
    modelLabel: 'Mock',
    credentialRequired: false,
    timeoutMs: 45_000,
    encryptionKey: null,
  })
})

test('AI runtime config validates and decodes Gemini server settings', () => {
  const config = readAiRuntimeConfig({
    TEAMFLOW_AI_PROVIDER: 'gemini',
    TEAMFLOW_GEMINI_MODEL: 'gemini-test-flash',
    TEAMFLOW_AI_REQUEST_TIMEOUT_MS: '12000',
    TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY: masterKey,
  })

  assert.equal(config.mode, 'live')
  assert.equal(config.provider, 'gemini')
  assert.equal(config.model, 'gemini-test-flash')
  assert.equal(config.modelLabel, 'gemini-test-flash')
  assert.equal(config.credentialRequired, true)
  assert.equal(config.timeoutMs, 12_000)
  assert.deepEqual(config.encryptionKey, Buffer.alloc(32, 7))
})

test('AI runtime config rejects implicit, unknown, or unsafe production settings', () => {
  assert.throws(
    () => readAiRuntimeConfig({}),
    /TEAMFLOW_AI_PROVIDER/,
  )
  assert.throws(
    () => readAiRuntimeConfig({ TEAMFLOW_AI_PROVIDER: 'automatic' }),
    /mock 또는 gemini/,
  )
  assert.throws(
    () => readAiRuntimeConfig({
      TEAMFLOW_AI_PROVIDER: 'gemini',
      TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY: 'not-base64',
    }),
    /32바이트 Base64/,
  )
  assert.throws(
    () => readAiRuntimeConfig({
      TEAMFLOW_AI_PROVIDER: 'gemini',
      TEAMFLOW_GEMINI_MODEL: 'https://attacker.example/model',
      TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY: masterKey,
    }),
    /모델/,
  )
  assert.throws(
    () => readAiRuntimeConfig({
      TEAMFLOW_AI_PROVIDER: 'gemini',
      TEAMFLOW_AI_REQUEST_TIMEOUT_MS: '999999',
      TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY: masterKey,
    }),
    /시간/,
  )
})
