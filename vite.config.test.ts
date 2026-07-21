import { describe, expect, it } from 'vitest';

import config, { resolveWebBuildEnv } from './vite.config';

type VitestConfiguration = {
  plugins?: Array<{ name?: string }>;
  test?: {
    exclude?: string[];
  };
};

describe('Vitest 설정', () => {
  it('Git worktree 하위 테스트를 탐색에서 제외한다', () => {
    const vitestConfiguration = config as VitestConfiguration;

    expect(vitestConfiguration.test?.exclude).toContain('**/.worktrees/**');
  });

  it('웹 빌드 전에 Supabase 공개 설정을 검증하는 플러그인을 사용한다', () => {
    const vitestConfiguration = config as VitestConfiguration;

    expect(vitestConfiguration.plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'validate-supabase-build-env' }),
      ])
    );
  });

  it('웹 빌드 전에 선택적인 Capacitor API 원점도 검증한다', () => {
    expect(() =>
      resolveWebBuildEnv(
        {
          VITE_CAPACITOR_API_ORIGIN: 'http://api.example.com',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_file',
          VITE_SUPABASE_URL: 'https://file.supabase.co',
        },
        {}
      )
    ).toThrow('HTTPS');
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
    '안전하지 않은 Supabase 설정으로 웹 빌드를 시작하지 않는다',
    (publishableKey, url, message) => {
      expect(() =>
        resolveWebBuildEnv(
          {
            VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_file',
            VITE_SUPABASE_URL: 'https://file.supabase.co',
          },
          {
            VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
            VITE_SUPABASE_URL: url,
          }
        )
      ).toThrow(message);
    }
  );
});
