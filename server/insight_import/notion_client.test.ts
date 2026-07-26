import { describe, expect, it, vi } from 'vitest';

import {
  createInitialNotionAnalysisCursor,
  createNotionImportClient,
  NotionClientError,
  runNotionAnalysisSlice,
} from './notion_client';

describe('NotionImportClient', () => {
  it('최신 API 버전과 인증 header, cursor를 모든 요청에 보낸다', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => jsonResponse(createList()));
    const client = createNotionImportClient({
      accessToken: 'oauth-token',
      fetch,
    });

    await client.search('page', 'search-cursor');
    await client.queryDataSource('data-source-id', 'data-cursor');
    await client.listBlockChildren('block-id', 'block-cursor');
    await client.retrievePageProperty(
      'page-id',
      'property-id',
      'property-cursor'
    );

    expect(fetch).toHaveBeenCalledTimes(4);
    for (const [, init] of fetch.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe('Bearer oauth-token');
      expect(headers.get('notion-version')).toBe('2026-03-11');
      expect(headers.get('content-type')).toBe('application/json');
    }
    expect(String(fetch.mock.calls[0]?.[1]?.body)).toContain('search-cursor');
    expect(String(fetch.mock.calls[1]?.[1]?.body)).toContain('data-cursor');
    expect(String(fetch.mock.calls[2]?.[0])).toContain('block-cursor');
    expect(String(fetch.mock.calls[3]?.[0])).toContain('property-cursor');
  });

  it('429 Retry-After를 우선하고 없으면 500ms 지수 backoff를 쓴다', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse(createList()));
    const client = createNotionImportClient({
      accessToken: 'oauth-token',
      fetch,
      jitter: () => 0,
      sleep,
    });

    await client.search('page', null);

    expect(sleep).toHaveBeenNthCalledWith(1, 2000);
    expect(sleep).toHaveBeenNthCalledWith(2, 1000);
  });

  it.each([500, 502, 503, 504])(
    '%i 응답만 최대 3회 재시도한다',
    async (status) => {
      const fetch = vi.fn().mockResolvedValue(jsonResponse({}, status));
      const client = createNotionImportClient({
        accessToken: 'oauth-token',
        fetch,
        jitter: () => 0,
        sleep: vi.fn().mockResolvedValue(undefined),
      });

      await expect(client.search('page', null)).rejects.toBeInstanceOf(
        NotionClientError
      );
      expect(fetch).toHaveBeenCalledTimes(4);
    }
  );

  it.each([
    [400, 'invalid-request'],
    [401, 'reauthorize'],
    [403, 'forbidden'],
    [404, 'not-found'],
  ] as const)(
    '%i를 안전한 %s 오류로 바꾸고 재시도하지 않는다',
    async (status, code) => {
      const fetch = vi.fn().mockResolvedValue(jsonResponse({}, status));
      const client = createNotionImportClient({
        accessToken: 'oauth-token',
        fetch,
      });

      await expect(client.search('page', null)).rejects.toMatchObject({ code });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );

  it('한 slice를 8개 요청으로 제한하고 cursor에서 이어간다', async () => {
    const client = {
      listBlockChildren: vi.fn().mockResolvedValue(createList()),
      queryDataSource: vi.fn(),
      retrieveDataSource: vi.fn(),
      retrievePageProperty: vi.fn(),
      search: vi.fn().mockResolvedValue({
        ...createList(),
        results: Array.from({ length: 10 }, (_, index) => ({
          id: `page-${index}`,
          object: 'page',
        })),
      }),
    };

    const first = await runNotionAnalysisSlice(
      client,
      createInitialNotionAnalysisCursor()
    );

    expect(first.requestCount).toBe(8);
    expect(first.cursor.stage).toBe('blocks');
    expect(first.cursor.blockQueue).toHaveLength(3);

    const second = await runNotionAnalysisSlice(client, first.cursor);

    expect(second.requestCount).toBe(3);
    expect(second.cursor.stage).toBe('complete');
    expect(second.cursor.visitedBlockIds).toHaveLength(10);
  });

  it('page 속성 목록을 cursor 끝까지 이어서 가져온다', async () => {
    const cursor = createInitialNotionAnalysisCursor() as ReturnType<
      typeof createInitialNotionAnalysisCursor
    > & {
      propertyQueue: Array<{
        collectionPath: string[];
        cursor: string | null;
        explicitMemoCandidate: string | null;
        nextIndex: number;
        pageId: string;
        propertyId: string;
        titleCandidate: string | null;
      }>;
    };
    cursor.stage = 'complete';
    cursor.propertyQueue = [
      {
        collectionPath: ['업무 자료'],
        cursor: null,
        explicitMemoCandidate: '메모',
        nextIndex: 0,
        pageId: 'page-id',
        propertyId: 'link-property',
        titleCandidate: '제목',
      },
    ];
    const client = {
      listBlockChildren: vi.fn(),
      queryDataSource: vi.fn(),
      retrieveDataSource: vi.fn(),
      retrievePageProperty: vi
        .fn()
        .mockResolvedValueOnce({
          ...createList(),
          has_more: true,
          next_cursor: 'property-cursor',
          results: [{ rich_text: { href: 'https://example.com/1' } }],
        })
        .mockResolvedValueOnce({
          ...createList(),
          results: [{ rich_text: { href: 'https://example.com/2' } }],
        }),
      search: vi.fn(),
    };

    const result = (await runNotionAnalysisSlice(client, cursor)) as Awaited<
      ReturnType<typeof runNotionAnalysisSlice>
    > & {
      properties: Array<{ index: number; item: unknown }>;
    };

    expect(client.retrievePageProperty).toHaveBeenNthCalledWith(
      1,
      'page-id',
      'link-property',
      null
    );
    expect(client.retrievePageProperty).toHaveBeenNthCalledWith(
      2,
      'page-id',
      'link-property',
      'property-cursor'
    );
    expect(result.properties.map(({ index }) => index)).toEqual([0, 1]);
    expect(result.cursor.propertyQueue).toEqual([]);
    expect(result.requestCount).toBe(2);
  });

  it('같은 data source의 페이지를 이어서 조회할 때 schema를 한 번만 가져온다', async () => {
    const cursor = createInitialNotionAnalysisCursor();
    cursor.stage = 'data-sources';
    cursor.dataSourceQueue = [
      {
        cursor: null,
        dataSourceId: 'data-source-id',
      },
    ];
    const client = {
      listBlockChildren: vi.fn(),
      queryDataSource: vi
        .fn()
        .mockResolvedValueOnce({
          ...createList(),
          has_more: true,
          next_cursor: 'next-page',
          results: [],
        })
        .mockResolvedValueOnce(createList()),
      retrieveDataSource: vi.fn().mockResolvedValue({
        id: 'data-source-id',
        title: [{ plain_text: '업무 자료' }],
      }),
      retrievePageProperty: vi.fn(),
      search: vi.fn(),
    };

    const result = await runNotionAnalysisSlice(client, cursor);

    expect(client.retrieveDataSource).toHaveBeenCalledTimes(1);
    expect(client.queryDataSource).toHaveBeenCalledTimes(2);
    expect(result.dataSources).toHaveLength(1);
    expect(result.requestCount).toBe(3);
  });

  it('cursor queue나 visited가 10,000개를 넘으면 중단한다', async () => {
    const cursor = createInitialNotionAnalysisCursor();
    cursor.visitedPageIds = Array.from(
      { length: 10_001 },
      (_, index) => `page-${index}`
    );

    await expect(
      runNotionAnalysisSlice(
        {
          listBlockChildren: vi.fn(),
          queryDataSource: vi.fn(),
          retrieveDataSource: vi.fn(),
          retrievePageProperty: vi.fn(),
          search: vi.fn(),
        },
        cursor
      )
    ).rejects.toMatchObject({ code: 'invalid-request' });
  });
});

function createList() {
  return {
    has_more: false,
    next_cursor: null,
    object: 'list',
    results: [],
    type: 'page_or_data_source',
  };
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...headers },
    status,
  });
}
