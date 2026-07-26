import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  capture: vi.fn(),
  cleanup: vi.fn(),
  cleanupConfig: vi.fn(),
  notionConfig: vi.fn(),
  notionStart: vi.fn(),
  revokeExpiredConnections: vi.fn(),
  updateMemo: vi.fn(),
}));

vi.mock('./supabase_insight_capture.js', () => ({
  createSupabaseInsightCaptureService: () => ({
    capture: serviceMocks.capture,
  }),
}));

vi.mock('./supabase_insight_memo.js', () => ({
  createSupabaseInsightMemoService: () => ({
    update: serviceMocks.updateMemo,
  }),
}));

vi.mock('./insight_import/import_cleanup_service.js', () => ({
  createSupabaseImportCleanupService: (
    config: unknown,
    revokeExpiredConnections: unknown
  ) => {
    serviceMocks.cleanupConfig(config);
    serviceMocks.revokeExpiredConnections(revokeExpiredConnections);

    return {
      cleanup: serviceMocks.cleanup,
    };
  },
}));

vi.mock('./insight_import/notion_import_service.js', () => ({
  createSupabaseExpiredNotionConnectionRevoker: vi.fn(() => vi.fn()),
  createSupabaseNotionImportService: (config: unknown) => {
    serviceMocks.notionConfig(config);

    return {
      analyze: vi.fn(),
      cancel: vi.fn(),
      complete: vi.fn(),
      handleCallback: vi.fn(),
      start: serviceMocks.notionStart,
      status: vi.fn(),
    };
  },
}));

import { createOperatingApp } from './operating_app';

const environment = {
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
};

describe('운영 API 서비스 조립', () => {
  beforeEach(() => {
    serviceMocks.capture.mockReset();
    serviceMocks.cleanup.mockReset();
    serviceMocks.cleanupConfig.mockReset();
    serviceMocks.notionConfig.mockReset();
    serviceMocks.notionStart.mockReset();
    serviceMocks.revokeExpiredConnections.mockReset();
    serviceMocks.updateMemo.mockReset();
  });

  it('캡처 요청을 운영 캡처 서비스에 전달한다', async () => {
    serviceMocks.capture.mockResolvedValue({
      ok: false,
      reason: 'invalid-request',
    });
    const app = createOperatingApp(environment);

    const response = await request(app)
      .post('/api/insights/capture')
      .set('Authorization', 'Bearer access-token')
      .send({ source: 'web', url: 'https://example.com' });

    expect(response.status).toBe(400);
    expect(serviceMocks.capture).toHaveBeenCalledWith('access-token', {
      source: 'web',
      url: 'https://example.com',
    });
  });

  it('메모 요청을 운영 메모 서비스에 전달한다', async () => {
    serviceMocks.updateMemo.mockResolvedValue({
      ok: false,
      reason: 'not-found',
    });
    const app = createOperatingApp(environment);

    const response = await request(app)
      .patch('/api/insights/123e4567-e89b-42d3-a456-426614174000/memo')
      .set('Authorization', 'Bearer access-token')
      .send({ memo: '다시 보기' });

    expect(response.status).toBe(404);
    expect(serviceMocks.updateMemo).toHaveBeenCalledWith(
      'access-token',
      '123e4567-e89b-42d3-a456-426614174000',
      { memo: '다시 보기' }
    );
  });

  it('비밀 설정이 없으면 기존 API는 유지하고 만료 정리만 비활성화한다', async () => {
    const app = createOperatingApp(environment);

    const response = await request(app).get('/api/cron/import-cleanup');

    expect(response.status).toBe(401);
    expect(serviceMocks.cleanupConfig).not.toHaveBeenCalled();
  });

  it('서버 전용 설정으로 만료 정리 서비스를 조립한다', async () => {
    serviceMocks.cleanup.mockResolvedValue({ deletedJobCount: 2 });
    const app = createOperatingApp({
      ...environment,
      CRON_SECRET: 'cron-secret',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    });

    const response = await request(app)
      .get('/api/cron/import-cleanup')
      .set('Authorization', 'Bearer cron-secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, deletedJobCount: 2 });
    expect(serviceMocks.cleanupConfig).toHaveBeenCalledWith({
      serviceRoleKey: 'service-role-key',
      url: 'https://project.supabase.co',
    });
  });

  it('Notion 설정 일부만 제공되면 시작을 거부한다', () => {
    expect(() =>
      createOperatingApp({
        ...environment,
        CRON_SECRET: 'cron-secret',
        NOTION_CLIENT_ID: 'client-id',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      })
    ).toThrow('IMPORT_APP_ORIGIN');
  });

  it('완전한 Notion 서버 설정으로 OAuth 서비스를 조립한다', async () => {
    serviceMocks.notionStart.mockResolvedValue({
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      connectionId: '10000000-0000-4000-8000-000000000001',
    });
    const notion = {
      appOrigin: 'https://app.example',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://app.example/api/imports/notion/callback',
      tokenEncryptionKey: Buffer.alloc(32).toString('base64'),
    };
    const app = createOperatingApp({
      ...environment,
      CRON_SECRET: 'cron-secret',
      IMPORT_APP_ORIGIN: notion.appOrigin,
      IMPORT_TOKEN_ENCRYPTION_KEY: notion.tokenEncryptionKey,
      NOTION_CLIENT_ID: notion.clientId,
      NOTION_CLIENT_SECRET: notion.clientSecret,
      NOTION_REDIRECT_URI: notion.redirectUri,
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    });

    const response = await request(app)
      .post('/api/imports/notion/start')
      .set('Authorization', 'Bearer access-token')
      .send({ includePageUrls: false, returnMode: 'web' });

    expect(response.status).toBe(200);
    expect(serviceMocks.notionConfig).toHaveBeenCalledWith({
      notion,
      publishableKey: 'sb_publishable_test',
      serviceRoleKey: 'service-role-key',
      url: 'https://project.supabase.co',
    });
    expect(serviceMocks.revokeExpiredConnections).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });
});
