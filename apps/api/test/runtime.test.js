import assert from 'node:assert/strict'
import test from 'node:test'

import { createConfiguredTeamFlowApp } from '../src/runtime.js'

const baseEnvironment = {
  TEAMFLOW_SUPABASE_URL: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
  TEAMFLOW_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-only',
  TEAMFLOW_ALLOWED_ORIGINS: 'https://teamflow.example',
}

test('runtime composes explicit Mock and Gemini dependencies without making provider requests', () => {
  const mockApp = createConfiguredTeamFlowApp({
    environment: {
      ...baseEnvironment,
      TEAMFLOW_AI_PROVIDER: 'mock',
    },
    fetchImpl: () => assert.fail('Mock runtime must not call Gemini'),
  })
  assert.equal(typeof mockApp.listen, 'function')

  const geminiApp = createConfiguredTeamFlowApp({
    environment: {
      ...baseEnvironment,
      TEAMFLOW_AI_PROVIDER: 'gemini',
      TEAMFLOW_GEMINI_MODEL: 'gemini-test-flash',
      TEAMFLOW_AI_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
    },
    fetchImpl: () => assert.fail('runtime construction must not call Gemini'),
  })
  assert.equal(typeof geminiApp.listen, 'function')
})

