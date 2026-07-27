import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createNotionImportApi,
  NotionImportApiError,
} from './notion_import_api';

const CONNECTION_ID = '10000000-0000-4000-8000-000000000001';

describe('Notion 가져오기 API', () => {
  it('모든 요청에 현재 Supabase session bearer와 상대 API path를 사용한다', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'completed' }), { status: 200 })
      );
    const api = createNotionImportApi({
      client: createClient(),
      fetch,
    });

    await api.complete(CONNECTION_ID);

    expect(fetch).toHaveBeenCalledWith(
      `/api/imports/notion/${CONNECTION_ID}/complete`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer session-access-token',
        }),
        method: 'POST',
      })
    );
  });

  it('start 선택값만 JSON으로 보내고 authorize URL을 반환한다', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
          connectionId: CONNECTION_ID,
        }),
        { status: 200 }
      )
    );
    const api = createNotionImportApi({ client: createClient(), fetch });

    await expect(api.start(true, 'android')).resolves.toEqual({
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      connectionId: CONNECTION_ID,
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/imports/notion/start',
      expect.objectContaining({
        body: JSON.stringify({
          includePageUrls: true,
          returnMode: 'android',
        }),
      })
    );
  });

  it('오류에는 Provider URL·제목·token·응답 본문을 노출하지 않는다', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          reason: 'reauthorize',
          title: 'SENSITIVE_TITLE',
          token: 'SENSITIVE_TOKEN',
          url: 'https://private.example',
        }),
        { status: 409 }
      )
    );
    const api = createNotionImportApi({ client: createClient(), fetch });

    const error = await api.status(CONNECTION_ID).catch((value) => value);

    expect(error).toBeInstanceOf(NotionImportApiError);
    expect(error).toMatchObject({ reason: 'reauthorize', status: 409 });
    expect(String(error)).not.toContain('SENSITIVE');
    expect(String(error)).not.toContain('private.example');
    expect(String(error)).not.toContain('session-access-token');
  });

  it('mapping 응답에서 데이터베이스 이름과 field 계약을 검증한다', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidateCount: 0,
          mappingRequests: [
            {
              dataSourceId: 'data-source-id',
              dataSourceName: '업무 자료',
              fields: [{ id: 'url-field', name: '링크', type: 'url' }],
              suggestedUrlPropertyId: 'url-field',
            },
          ],
          requestCount: 2,
          status: 'mapping-required',
        }),
        { status: 200 }
      )
    );
    const api = createNotionImportApi({ client: createClient(), fetch });

    await expect(api.analyze(CONNECTION_ID, [])).resolves.toMatchObject({
      mappingRequests: [
        expect.objectContaining({
          dataSourceId: 'data-source-id',
          dataSourceName: '업무 자료',
        }),
      ],
      status: 'mapping-required',
    });
  });
});

function createClient() {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'session-access-token' },
        },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}
