import { describe, expect, it } from 'vitest';

import { resolveExtensionBuildEnv } from './vite.config';

describe('Chrome 확장 빌드 환경', () => {
  it('CI 환경 변수가 파일의 API 주소보다 우선한다', () => {
    const environment = resolveExtensionBuildEnv(
      {
        VITE_EXTENSION_API_ORIGIN: 'http://localhost:3001',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_file',
        VITE_SUPABASE_URL: 'https://file-project.supabase.co',
      },
      {
        VITE_EXTENSION_API_ORIGIN: 'https://hub-ppre1udes-projects.vercel.app',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ci',
        VITE_SUPABASE_URL: 'https://ci-project.supabase.co',
      }
    );

    expect(environment).toEqual({
      apiOrigin: 'https://hub-ppre1udes-projects.vercel.app',
      publishableKey: 'sb_publishable_ci',
      supabaseUrl: 'https://ci-project.supabase.co',
    });
  });
});
