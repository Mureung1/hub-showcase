import { describe, expect, it } from 'vitest';

import { readSupabaseServerConfig } from './supabase_config';

describe('readSupabaseServerConfig', () => {
  it('reads the public Supabase endpoint and publishable key for server-side token validation', () => {
    expect(
      readSupabaseServerConfig({
        VITE_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
        VITE_SUPABASE_URL: 'https://project.supabase.co',
      })
    ).toEqual({
      publishableKey: 'publishable-key',
      url: 'https://project.supabase.co',
    });
  });

  it('fails fast when the server cannot preserve authenticated capture access', () => {
    expect(() => readSupabaseServerConfig({})).toThrow(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required'
    );
  });
});
