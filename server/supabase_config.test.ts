import { describe, expect, it } from 'vitest';

import { readSupabaseServerConfig } from './supabase_config';

describe('readSupabaseServerConfig', () => {
  it('reads the public Supabase endpoint and publishable key for server-side token validation', () => {
    expect(
      readSupabaseServerConfig({
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-key',
        VITE_SUPABASE_URL: 'https://project.supabase.co',
      })
    ).toEqual({
      publishableKey: 'sb_publishable_public-key',
      url: 'https://project.supabase.co',
    });
  });

  it('fails fast when the server cannot preserve authenticated capture access', () => {
    expect(() => readSupabaseServerConfig({})).toThrow(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required'
    );
  });

  it.each([
    ['sb_secret_private-key', 'https://project.supabase.co', '비밀키'],
    [
      'header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
      'https://project.supabase.co',
      '비밀키',
    ],
    ['sb_publishable_public-key', 'http://project.supabase.co', 'HTTPS'],
  ])(
    '안전하지 않은 Supabase 서버 설정을 거부한다',
    (publishableKey, url, message) => {
      expect(() =>
        readSupabaseServerConfig({
          VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
          VITE_SUPABASE_URL: url,
        })
      ).toThrow(message);
    }
  );
});
