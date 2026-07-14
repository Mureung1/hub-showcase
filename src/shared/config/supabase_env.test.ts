import { describe, expect, it } from 'vitest';

import { parseSupabaseEnv } from './supabase_env';

describe('parseSupabaseEnv', () => {
  it('returns a validated public Supabase configuration', () => {
    expect(
      parseSupabaseEnv({
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-key',
        VITE_SUPABASE_URL: 'https://project-ref.supabase.co',
      })
    ).toEqual({
      publishableKey: 'sb_publishable_public-key',
      url: 'https://project-ref.supabase.co',
    });
  });

  it.each([
    [{ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-key' }, 'URL'],
    [{ VITE_SUPABASE_URL: 'https://project-ref.supabase.co' }, '공개 키'],
    [
      {
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-key',
        VITE_SUPABASE_URL: 'not-a-url',
      },
      '올바른 URL',
    ],
    [
      {
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private-key',
        VITE_SUPABASE_URL: 'https://project-ref.supabase.co',
      },
      '비밀키',
    ],
    [
      {
        VITE_SUPABASE_PUBLISHABLE_KEY:
          'header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
        VITE_SUPABASE_URL: 'https://project-ref.supabase.co',
      },
      '비밀키',
    ],
    [
      {
        VITE_SUPABASE_PUBLISHABLE_KEY: 'not-a-public-supabase-key',
        VITE_SUPABASE_URL: 'https://project-ref.supabase.co',
      },
      '공개 키 형식',
    ],
  ])('rejects unsafe or incomplete public settings', (source, message) => {
    expect(() => parseSupabaseEnv(source)).toThrow(message);
  });

  it('allows plain HTTP only for a local Supabase instance', () => {
    expect(
      parseSupabaseEnv({
        VITE_SUPABASE_PUBLISHABLE_KEY: 'header.eyJyb2xlIjoiYW5vbiJ9.signature',
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      })
    ).toEqual({
      publishableKey: 'header.eyJyb2xlIjoiYW5vbiJ9.signature',
      url: 'http://127.0.0.1:54321',
    });

    expect(() =>
      parseSupabaseEnv({
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public-key',
        VITE_SUPABASE_URL: 'http://project-ref.supabase.co',
      })
    ).toThrow('HTTPS');
  });
});
