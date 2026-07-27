import { describe, expect, it } from 'vitest';

import { readImportServerConfig } from './import_server_config';

describe('readImportServerConfig', () => {
  it('두 비밀 설정이 모두 없으면 만료 정리만 비활성화한다', () => {
    expect(readImportServerConfig({})).toBeNull();
  });

  it.each([
    [{ CRON_SECRET: 'cron-secret' }, 'SUPABASE_SERVICE_ROLE_KEY'],
    [{ SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' }, 'CRON_SECRET'],
  ])('일부 비밀 설정만 있으면 시작을 거부한다', (environment, missingKey) => {
    expect(() => readImportServerConfig(environment)).toThrow(missingKey);
  });

  it('두 비밀 설정이 모두 있으면 서버 전용 설정을 반환한다', () => {
    expect(
      readImportServerConfig({
        CRON_SECRET: '  cron-secret  ',
        SUPABASE_SERVICE_ROLE_KEY: '  service-role-key  ',
      })
    ).toEqual({
      cronSecret: 'cron-secret',
      serviceRoleKey: 'service-role-key',
    });
  });

  it('cleanup만 설정하면 Notion 연결은 활성화하지 않는다', () => {
    expect(
      readImportServerConfig({
        CRON_SECRET: 'cron-secret',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      })
    ).not.toHaveProperty('notion');
  });

  it('Notion 설정 일부만 있으면 시작을 거부한다', () => {
    expect(() =>
      readImportServerConfig({
        CRON_SECRET: 'cron-secret',
        NOTION_CLIENT_ID: 'client-id',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      })
    ).toThrow('IMPORT_APP_ORIGIN');
  });

  it('유효한 Notion 서버 설정을 파싱한다', () => {
    const encryptionKey = Buffer.alloc(32, 7).toString('base64');

    expect(
      readImportServerConfig({
        CRON_SECRET: 'cron-secret',
        IMPORT_APP_ORIGIN: 'https://app.example.com',
        IMPORT_TOKEN_ENCRYPTION_KEY: encryptionKey,
        NOTION_CLIENT_ID: 'client-id',
        NOTION_CLIENT_SECRET: 'client-secret',
        NOTION_REDIRECT_URI:
          'https://app.example.com/api/import/notion/callback',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      })
    ).toMatchObject({
      notion: {
        appOrigin: 'https://app.example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://app.example.com/api/import/notion/callback',
        tokenEncryptionKey: encryptionKey,
      },
    });
  });

  it.each([
    ['IMPORT_APP_ORIGIN', 'http://app.example.com'],
    ['NOTION_REDIRECT_URI', 'http://app.example.com/callback'],
  ])('production에서 안전하지 않은 %s를 거부한다', (name, value) => {
    expect(() =>
      readImportServerConfig({
        CRON_SECRET: 'cron-secret',
        IMPORT_APP_ORIGIN: 'https://app.example.com',
        IMPORT_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
        NODE_ENV: 'production',
        NOTION_CLIENT_ID: 'client-id',
        NOTION_CLIENT_SECRET: 'client-secret',
        NOTION_REDIRECT_URI: 'https://app.example.com/callback',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        [name]: value,
      })
    ).toThrow(name);
  });

  it('development의 localhost HTTP redirect를 허용한다', () => {
    expect(
      readImportServerConfig({
        CRON_SECRET: 'cron-secret',
        IMPORT_APP_ORIGIN: 'http://localhost:5173',
        IMPORT_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
        NODE_ENV: 'development',
        NOTION_CLIENT_ID: 'client-id',
        NOTION_CLIENT_SECRET: 'client-secret',
        NOTION_REDIRECT_URI: 'http://127.0.0.1:5173/callback',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      })
    ).toHaveProperty('notion');
  });

  it('VITE 접두 비밀 설정을 거부한다', () => {
    expect(() =>
      readImportServerConfig({
        VITE_CRON_SECRET: 'browser-cron-secret',
        VITE_SUPABASE_SERVICE_ROLE_KEY: 'browser-service-role-key',
      })
    ).toThrow('VITE_SUPABASE_SERVICE_ROLE_KEY');
  });
});
