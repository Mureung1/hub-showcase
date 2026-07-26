import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@supabase/supabase-js')>()),
  createClient: supabaseMocks.createClient,
}));

import {
  createImportAdminStore,
  createSupabaseImportAdminStore,
} from './supabase_import_admin_store';

const CONNECTION_ID = '10000000-0000-4000-8000-000000000001';
const JOB_ID = '20000000-0000-4000-8000-000000000001';
const USER_ID = '30000000-0000-4000-8000-000000000001';
const NOW = '2026-07-26T00:00:00.000Z';

describe('Supabase import admin store', () => {
  beforeEach(() => {
    supabaseMocks.createClient.mockReset();
  });

  it('service role client에서 브라우저 session 기능을 모두 끈다', () => {
    const { client } = createClientMock();
    supabaseMocks.createClient.mockReturnValue(client);

    createSupabaseImportAdminStore({
      serviceRoleKey: 'service-role-key',
      url: 'https://project.supabase.co',
    });

    expect(supabaseMocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    );
  });

  it('연결을 만들고 명시한 열만 조회한다', async () => {
    const { builder, client } = createClientMock();
    const store = createImportAdminStore(client);
    builder.maybeSingle.mockResolvedValue({
      data: createConnectionRow(),
      error: null,
    });
    builder.order.mockResolvedValue({
      data: [createConnectionRow()],
      error: null,
    });

    await store.createConnection({
      expiresAt: '2026-07-26T23:00:00.000Z',
      id: CONNECTION_ID,
      includePageUrls: false,
      jobId: JOB_ID,
      returnMode: 'web',
      stateExpiresAt: '2026-07-26T00:10:00.000Z',
      stateHash: 'a'.repeat(64),
      userId: USER_ID,
    });
    await expect(store.getConnection(CONNECTION_ID)).resolves.toMatchObject({
      id: CONNECTION_ID,
      status: 'connected',
    });
    await expect(store.listExpiredConnections(NOW)).resolves.toHaveLength(1);

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: CONNECTION_ID,
        provider: 'notion',
        status: 'pending',
      })
    );
    expect(builder.select).not.toHaveBeenCalledWith('*');
    expect(builder.select).toHaveBeenCalledWith(
      expect.stringContaining('access_ciphertext')
    );
  });

  it('state 소비, 암호화 token 저장과 완료를 RPC에 전달한다', async () => {
    const { client, rpc } = createClientMock();
    const store = createImportAdminStore(client);
    rpc.mockImplementation(async (name: string) => {
      if (name === 'consume_insight_import_oauth_state') {
        return {
          data: {
            expiresAt: '2026-07-26T23:00:00.000Z',
            id: CONNECTION_ID,
            includePageUrls: true,
            jobId: JOB_ID,
            provider: 'notion',
            returnMode: 'android',
            userId: USER_ID,
          },
          error: null,
        };
      }

      return { data: null, error: null };
    });

    await expect(store.consumeState('b'.repeat(64))).resolves.toMatchObject({
      id: CONNECTION_ID,
      returnMode: 'android',
    });
    await store.storeTokens(CONNECTION_ID, {
      accessToken: createEncryptedToken('access'),
      refreshToken: null,
      workspaceId: 'workspace-id',
      workspaceName: '워크스페이스',
    });
    await store.finishConnection(CONNECTION_ID, 'completed');

    expect(rpc).toHaveBeenCalledWith(
      'store_insight_import_oauth_tokens',
      expect.objectContaining({
        p_connection_id: CONNECTION_ID,
        p_tokens: expect.objectContaining({
          accessCiphertext: 'access-ciphertext',
          refreshCiphertext: null,
        }),
      })
    );
    expect(rpc).toHaveBeenCalledWith('finish_insight_import_connection', {
      p_connection_id: CONNECTION_ID,
      p_status: 'completed',
    });
  });

  it('알 수 없는 RPC 응답을 안전한 오류로 거부한다', async () => {
    const { client, rpc } = createClientMock();
    rpc.mockResolvedValue({
      data: { id: CONNECTION_ID, token: '노출되면 안 됨' },
      error: null,
    });

    await expect(
      createImportAdminStore(client).consumeState('c'.repeat(64))
    ).rejects.toThrow('가져오기 연결 정보를 처리하지 못했습니다.');
  });
});

function createClientMock() {
  const builder = {
    eq: vi.fn(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    lt: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.lt.mockReturnValue(builder);
  const rpc = vi.fn();
  const client = {
    from: vi.fn().mockReturnValue(builder),
    rpc,
  } as unknown as Pick<SupabaseClient, 'from' | 'rpc'>;

  return { builder, client, rpc };
}

function createConnectionRow() {
  return {
    access_auth_tag: 'access-tag',
    access_ciphertext: 'access-ciphertext',
    access_nonce: 'access-nonce',
    created_at: NOW,
    expires_at: '2026-07-26T23:00:00.000Z',
    id: CONNECTION_ID,
    include_page_urls: false,
    job_id: JOB_ID,
    key_version: 1,
    provider: 'notion',
    refresh_auth_tag: null,
    refresh_ciphertext: null,
    refresh_nonce: null,
    return_mode: 'web',
    state_expires_at: '2026-07-26T00:10:00.000Z',
    state_hash: 'a'.repeat(64),
    status: 'connected',
    updated_at: NOW,
    user_id: USER_ID,
    workspace_id: 'workspace-id',
    workspace_name: '워크스페이스',
  };
}

function createEncryptedToken(prefix: string) {
  return {
    authTag: `${prefix}-tag`,
    ciphertext: `${prefix}-ciphertext`,
    keyVersion: 1 as const,
    nonce: `${prefix}-nonce`,
  };
}
