import { describe, expect, it } from 'vitest';

import { parseExtensionEnv } from './extension_env';

describe('parseExtensionEnv', () => {
  it('parses explicit production origins and a public Supabase key', () => {
    expect(
      parseExtensionEnv({
        VITE_EXTENSION_API_ORIGIN: 'https://amadda.example/',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public',
        VITE_SUPABASE_URL: 'https://project.supabase.co/',
      })
    ).toEqual({
      apiOrigin: 'https://amadda.example',
      publishableKey: 'sb_publishable_public',
      supabaseUrl: 'https://project.supabase.co',
    });
  });

  it('uses non-secret local development defaults when values are absent', () => {
    expect(parseExtensionEnv({})).toEqual({
      apiOrigin: 'http://localhost:3001',
      publishableKey: 'sb_publishable_local-development',
      supabaseUrl: 'http://127.0.0.1:54321',
    });
  });

  it.each([
    [
      'an insecure production API',
      { VITE_EXTENSION_API_ORIGIN: 'http://amadda.example' },
    ],
    ['an invalid API URL', { VITE_EXTENSION_API_ORIGIN: 'not-a-url' }],
    [
      'a secret Supabase key',
      { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_sensitive' },
    ],
  ])('rejects %s', (_label, source) => {
    expect(() => parseExtensionEnv(source)).toThrow();
  });
});
