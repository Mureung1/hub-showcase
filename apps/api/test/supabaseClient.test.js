import assert from 'node:assert/strict'
import test from 'node:test'

import { readTeamFlowSupabaseConfig } from '../src/lib/supabaseClient.js'

test('TeamFlow config accepts only the dedicated TeamFlow project', () => {
  assert.deepEqual(readTeamFlowSupabaseConfig({
    TEAMFLOW_SUPABASE_URL: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
    TEAMFLOW_SUPABASE_SECRET_KEY: 'sb_secret_test_only',
  }), {
    url: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
    secretKey: 'sb_secret_test_only',
  })
})

test('TeamFlow config rejects the TimeBox project', () => {
  assert.throws(() => readTeamFlowSupabaseConfig({
    TEAMFLOW_SUPABASE_URL: 'https://vimywtpiqsixlfiegpdd.supabase.co',
    TEAMFLOW_SUPABASE_SECRET_KEY: 'sb_secret_test_only',
  }), /TimeBox/)
})

test('TeamFlow config rejects legacy or missing secrets', () => {
  assert.throws(() => readTeamFlowSupabaseConfig({
    TEAMFLOW_SUPABASE_URL: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
    TEAMFLOW_SUPABASE_SECRET_KEY: 'legacy-service-role-key',
  }), /sb_secret_/)
})
