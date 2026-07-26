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

  it('VITE 접두 비밀 설정은 읽지 않는다', () => {
    expect(
      readImportServerConfig({
        VITE_CRON_SECRET: 'browser-cron-secret',
        VITE_SUPABASE_SERVICE_ROLE_KEY: 'browser-service-role-key',
      })
    ).toBeNull();
  });
});
