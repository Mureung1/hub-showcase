import { describe, expect, test } from 'vitest'

import { readBrowserSupabaseConfig } from './supabaseClient.js'

const publishableKey = 'sb_publishable_test_key'

describe('browser Supabase configuration', () => {
  test('accepts only the dedicated TeamFlow project and publishable key', () => {
    expect(readBrowserSupabaseConfig({
      VITE_TEAMFLOW_SUPABASE_URL: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
      VITE_TEAMFLOW_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    })).toEqual({ url: 'https://lmmeuoeuiouyowpthxwg.supabase.co', publishableKey })
  })

  test('rejects the TimeBox project and secret keys', () => {
    expect(() => readBrowserSupabaseConfig({
      VITE_TEAMFLOW_SUPABASE_URL: 'https://vimywtpiqsixlfiegpdd.supabase.co',
      VITE_TEAMFLOW_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    })).toThrow('TimeBox')
    expect(() => readBrowserSupabaseConfig({
      VITE_TEAMFLOW_SUPABASE_URL: 'https://lmmeuoeuiouyowpthxwg.supabase.co',
      VITE_TEAMFLOW_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden',
    })).toThrow('publishable key')
  })
})
