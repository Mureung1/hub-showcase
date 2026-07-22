import assert from 'node:assert/strict'
import test from 'node:test'

import { readTeamFlowSupabaseConfig } from '../src/lib/supabaseClient.js'

test('TeamFlow config accepts only the dedicated TeamFlow project', () => {
  assert.deepEqual(readTeamFlowSupabaseConfig({
    TEAMFLOW_SUPABASE_URL: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
    TEAMFLOW_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
  }), {
    url: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
    publishableKey: 'sb_publishable_test_only',
  })
})

test('TeamFlow config rejects the TimeBox project', () => {
  assert.throws(() => readTeamFlowSupabaseConfig({
    TEAMFLOW_SUPABASE_URL: 'https://vimywtpiqsixlfiegpdd.supabase.co',
    TEAMFLOW_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
  }), /TimeBox/)
})

test('TeamFlow config rejects secret or missing publishable keys', () => {
  assert.throws(() => readTeamFlowSupabaseConfig({
    TEAMFLOW_SUPABASE_URL: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
    TEAMFLOW_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never_use_in_client_flow',
  }), /sb_publishable_/)
})
