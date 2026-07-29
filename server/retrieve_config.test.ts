import { describe, expect, it } from 'vitest';

import { readOptionalRetrieveConfig } from './retrieve_config';

describe('꺼내보기 서버 설정', () => {
  it('Gemini 키가 없으면 기존 서버 기능만 유지한다', () => {
    expect(
      readOptionalRetrieveConfig({
        SUPABASE_SERVICE_ROLE_KEY: 'import-service-role-key',
      })
    ).toBeNull();
  });

  it('서버 전용 Gemini와 Supabase 설정을 반환한다', () => {
    expect(
      readOptionalRetrieveConfig({
        GEMINI_API_KEY: '  gemini-key  ',
        SUPABASE_SERVICE_ROLE_KEY: '  service-role-key  ',
        VITE_SUPABASE_URL: '  https://project.supabase.co  ',
      })
    ).toEqual({
      geminiApiKey: 'gemini-key',
      serviceRoleKey: 'service-role-key',
      supabaseUrl: 'https://project.supabase.co',
    });
  });

  it('Gemini 키만 있거나 브라우저에 비밀 키가 노출되면 거부한다', () => {
    expect(() =>
      readOptionalRetrieveConfig({
        GEMINI_API_KEY: 'gemini-key',
        VITE_SUPABASE_URL: 'https://project.supabase.co',
      })
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY');
    expect(() =>
      readOptionalRetrieveConfig({
        VITE_GEMINI_API_KEY: 'browser-key',
      })
    ).toThrow('VITE_GEMINI_API_KEY');
  });
});
