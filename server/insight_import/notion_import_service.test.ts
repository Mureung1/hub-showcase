import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import type { NotionAnalysisCursor } from './notion_client';
import {
  createNotionImportService,
  NotionImportServiceError,
  type NotionImportServiceDependencies,
} from './notion_import_service';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const CONNECTION_ID = '20000000-0000-4000-8000-000000000002';
const NOW = new Date('2026-07-25T00:00:00.000Z');
const INITIAL_CURSOR: NotionAnalysisCursor = {
  blockQueue: [],
  dataSourceQueue: [],
  propertyQueue: [],
  searchCursor: null,
  stage: 'search',
  visitedBlockIds: [],
  visitedDataSourceIds: [],
  visitedPageIds: [],
};

describe('NotionImportService', () => {
  it('state 원문은 authorize URL에만 넣고 DB에는 hash와 선택값을 저장한다', async () => {
    const dependencies = createDependencies();
    const service = createNotionImportService(dependencies);

    const result = await service.start('access-token', true, 'web');
    const authorizeUrl = new URL(result.authorizeUrl);

    expect(result.connectionId).toBe(CONNECTION_ID);
    expect(Object.fromEntries(authorizeUrl.searchParams)).toEqual({
      client_id: 'client-id',
      owner: 'user',
      redirect_uri: 'https://app.example/api/imports/notion/callback',
      response_type: 'code',
      state: 'state-value',
    });
    expect(dependencies.userStore.startJob).toHaveBeenCalledWith(
      'access-token',
      CONNECTION_ID,
      createHash('sha256').update(`notion\0${CONNECTION_ID}`).digest('hex')
    );
    expect(dependencies.adminStore.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        id: CONNECTION_ID,
        includePageUrls: true,
        stateHash: createHash('sha256').update('state-value').digest('hex'),
        userId: USER_ID,
      })
    );
    expect(
      JSON.stringify(
        dependencies.adminStore.createConnection.mock.calls[0]?.[0]
      )
    ).not.toContain('state-value');
  });

  it('callback은 state를 소비한 뒤 Basic 인증으로 code를 교환하고 고정 주소로 복귀한다', async () => {
    const dependencies = createDependencies();
    dependencies.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'notion-access',
          refresh_token: 'notion-refresh',
          workspace_id: 'workspace-id',
          workspace_name: '작업 공간',
        }),
        { status: 200 }
      )
    );
    const service = createNotionImportService(dependencies);

    const result = await service.handleCallback({
      code: 'oauth-code',
      state: 'state-value',
    });

    expect(
      dependencies.adminStore.consumeState.mock.invocationCallOrder[0]
    ).toBeLessThan(dependencies.fetch.mock.invocationCallOrder[0] ?? 0);
    const [, request] = dependencies.fetch.mock.calls[0] ?? [];
    expect(new Headers(request?.headers).get('authorization')).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`
    );
    expect(request?.body).toBe(
      JSON.stringify({
        code: 'oauth-code',
        grant_type: 'authorization_code',
        redirect_uri: 'https://app.example/api/imports/notion/callback',
      })
    );
    expect(dependencies.cipher.encrypt).toHaveBeenCalledWith(
      'notion-access',
      expect.objectContaining({ connectionId: CONNECTION_ID, userId: USER_ID })
    );
    expect(result.redirectUrl).toBe(
      `https://app.example/import?import=notion&connection=${CONNECTION_ID}`
    );
  });

  it('소비할 수 없는 state는 token endpoint를 호출하지 않는다', async () => {
    const dependencies = createDependencies();
    dependencies.adminStore.consumeState.mockResolvedValueOnce(null);
    const service = createNotionImportService(dependencies);

    await expect(
      service.handleCallback({ code: 'oauth-code', state: 'reused-state' })
    ).rejects.toMatchObject({ code: 'invalid-request' });
    expect(dependencies.fetch).not.toHaveBeenCalled();
  });

  it('분석 slice의 후보와 cursor를 저장하고 완료 시 준비 결과를 반환한다', async () => {
    const dependencies = createDependencies();
    dependencies.runAnalysisSlice.mockResolvedValueOnce({
      blocks: [
        {
          block: {
            bookmark: { url: 'https://example.com/article' },
            id: 'block-id',
            type: 'bookmark',
          },
          collectionPath: ['읽을거리'],
        },
      ],
      cursor: { ...INITIAL_CURSOR, stage: 'complete' },
      dataSources: [],
      pages: [],
      properties: [],
      requestCount: 2,
    });
    dependencies.userStore.finalize.mockResolvedValueOnce({
      id: CONNECTION_ID,
      status: 'ready',
    });
    const service = createNotionImportService(dependencies);

    const result = await service.analyze('access-token', CONNECTION_ID, []);

    expect(dependencies.userStore.appendItems).toHaveBeenCalledWith(
      'access-token',
      CONNECTION_ID,
      [
        expect.objectContaining({
          candidateId: 'notion:block:block-id:bookmark',
          normalizedUrl: 'https://example.com/article',
        }),
      ],
      expect.objectContaining({ stage: 'complete' })
    );
    expect(result).toEqual({
      candidateCount: 1,
      prepared: { id: CONNECTION_ID, status: 'ready' },
      requestCount: 2,
      status: 'ready',
    });
  });

  it('rich_text URL 속성 조회가 남으면 완료하지 않고 cursor에 예약한다', async () => {
    const dependencies = createDependencies();
    dependencies.runAnalysisSlice.mockResolvedValueOnce({
      blocks: [],
      cursor: { ...INITIAL_CURSOR, stage: 'complete' },
      dataSources: [
        {
          id: 'data-source-id',
          properties: {
            링크: {
              id: 'url-property',
              name: '링크',
              type: 'rich_text',
            },
          },
          title: [{ plain_text: '업무 자료' }],
        },
      ],
      pages: [
        {
          collectionPath: ['업무 자료'],
          page: {
            id: 'page-id',
            object: 'page',
            parent: {
              data_source_id: 'data-source-id',
              type: 'data_source_id',
            },
            properties: {
              링크: {
                id: 'url-property',
                rich_text: [{ plain_text: 'https://example.com/embedded' }],
                type: 'rich_text',
              },
            },
          },
        },
      ],
      properties: [],
      requestCount: 2,
    });
    dependencies.userStore.appendItems.mockResolvedValueOnce({
      candidateCount: 0,
    });
    const service = createNotionImportService(dependencies);

    const result = await service.analyze('access-token', CONNECTION_ID, [
      {
        dataSourceId: 'data-source-id',
        memoPropertyId: null,
        titlePropertyId: null,
        urlPropertyId: 'url-property',
      },
    ]);

    expect(dependencies.userStore.appendItems).toHaveBeenCalledWith(
      'access-token',
      CONNECTION_ID,
      [],
      expect.objectContaining({
        propertyQueue: [
          expect.objectContaining({
            pageId: 'page-id',
            propertyId: 'url-property',
          }),
        ],
      })
    );
    expect(dependencies.userStore.finalize).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'analyzing' });
  });

  it('reload 시 이미 ready인 작업은 Provider 재호출 없이 준비 결과를 복원한다', async () => {
    const dependencies = createDependencies();
    dependencies.userStore.getStatus.mockResolvedValueOnce({
      connectionId: CONNECTION_ID,
      includePageUrls: false,
      jobId: CONNECTION_ID,
      jobStatus: 'ready',
      status: 'connected',
      workspaceName: '작업 공간',
    });
    dependencies.userStore.finalize.mockResolvedValueOnce({
      id: CONNECTION_ID,
      status: 'ready',
    });
    const service = createNotionImportService(dependencies);

    await expect(
      service.analyze('access-token', CONNECTION_ID, [])
    ).resolves.toEqual({
      candidateCount: 0,
      prepared: { id: CONNECTION_ID, status: 'ready' },
      requestCount: 0,
      status: 'ready',
    });
    expect(dependencies.runAnalysisSlice).not.toHaveBeenCalled();
    expect(dependencies.userStore.appendItems).not.toHaveBeenCalled();
  });

  it('완료 시 access token 철회 뒤 암호화 token을 제거한다', async () => {
    const dependencies = createDependencies();
    dependencies.fetch.mockResolvedValueOnce(
      new Response(null, { status: 200 })
    );
    const service = createNotionImportService(dependencies);

    await expect(
      service.complete('access-token', CONNECTION_ID)
    ).resolves.toEqual({ status: 'completed' });

    expect(dependencies.fetch).toHaveBeenCalledWith(
      'https://api.notion.com/v1/oauth/revoke',
      expect.objectContaining({
        body: JSON.stringify({ token: 'decrypted-access-token' }),
        method: 'POST',
      })
    );
    expect(dependencies.adminStore.finishConnection).toHaveBeenCalledWith(
      CONNECTION_ID,
      'completed'
    );
  });

  it('철회가 일시 실패하면 token을 유지하고 cleanup-pending을 반환한다', async () => {
    const dependencies = createDependencies();
    dependencies.fetch.mockResolvedValueOnce(
      new Response(null, { status: 503 })
    );
    const service = createNotionImportService(dependencies);

    await expect(
      service.cancel('access-token', CONNECTION_ID)
    ).resolves.toEqual({ status: 'cleanup-pending' });
    expect(dependencies.adminStore.finishConnection).not.toHaveBeenCalled();
  });
});

function createDependencies() {
  const connection = {
    accessToken: {
      authTag: 'tag',
      ciphertext: 'ciphertext',
      keyVersion: 1 as const,
      nonce: 'nonce',
    },
    createdAt: NOW.toISOString(),
    expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
    id: CONNECTION_ID,
    includePageUrls: false,
    jobId: CONNECTION_ID,
    provider: 'notion' as const,
    refreshToken: null,
    returnMode: 'web' as const,
    stateExpiresAt: new Date(NOW.getTime() + 600_000).toISOString(),
    stateHash: createHash('sha256').update('state-value').digest('hex'),
    status: 'connected' as const,
    updatedAt: NOW.toISOString(),
    userId: USER_ID,
    workspaceId: 'workspace-id',
    workspaceName: '작업 공간',
  };
  const dependencies = {
    adminStore: {
      consumeState: vi.fn().mockResolvedValue({
        expiresAt: connection.expiresAt,
        id: CONNECTION_ID,
        includePageUrls: false,
        jobId: CONNECTION_ID,
        provider: 'notion',
        returnMode: 'web',
        userId: USER_ID,
      }),
      createConnection: vi.fn(),
      finishConnection: vi.fn(),
      getConnection: vi.fn().mockResolvedValue(connection),
      listExpiredConnections: vi.fn().mockResolvedValue([]),
      storeTokens: vi.fn(),
    },
    cipher: {
      decrypt: vi.fn().mockReturnValue('decrypted-access-token'),
      encrypt: vi.fn().mockReturnValue({
        authTag: 'encrypted-tag',
        ciphertext: 'encrypted-value',
        keyVersion: 1,
        nonce: 'encrypted-nonce',
      }),
    },
    config: {
      appOrigin: 'https://app.example',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://app.example/api/imports/notion/callback',
      tokenEncryptionKey: Buffer.alloc(32).toString('base64'),
    },
    createClient: vi.fn().mockReturnValue({}),
    fetch: vi.fn(),
    now: () => NOW,
    randomState: () => 'state-value',
    randomUuid: () => CONNECTION_ID,
    runAnalysisSlice: vi.fn(),
    userStore: {
      appendItems: vi.fn().mockResolvedValue({ candidateCount: 1 }),
      authenticate: vi.fn().mockResolvedValue(USER_ID),
      finalize: vi.fn(),
      getCursor: vi.fn().mockResolvedValue(INITIAL_CURSOR),
      getStatus: vi.fn().mockResolvedValue({
        connectionId: CONNECTION_ID,
        includePageUrls: false,
        jobId: CONNECTION_ID,
        jobStatus: 'analyzing',
        status: 'connected',
        workspaceName: '작업 공간',
      }),
      startJob: vi.fn(),
    },
  } satisfies NotionImportServiceDependencies;

  return dependencies;
}

void NotionImportServiceError;
