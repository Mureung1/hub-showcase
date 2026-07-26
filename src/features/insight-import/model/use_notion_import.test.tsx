/* @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NotionImportApi } from '../api/notion_import_api';
import type { PreparedImport } from './import_types';
import { useNotionImport } from './use_notion_import';

const CONNECTION_ID = '10000000-0000-4000-8000-000000000001';

afterEach(cleanup);

describe('useNotionImport', () => {
  it('connection status를 확인하고 analyzing slice를 반복해 준비 결과를 전달한다', async () => {
    const api = createApi();
    const prepared = createPreparedImport();
    api.status.mockResolvedValue({
      connectionId: CONNECTION_ID,
      includePageUrls: false,
      jobId: CONNECTION_ID,
      jobStatus: 'analyzing',
      status: 'connected',
      workspaceName: '팀 문서',
    });
    api.analyze
      .mockResolvedValueOnce({
        candidateCount: 3,
        requestCount: 8,
        status: 'analyzing',
      })
      .mockResolvedValueOnce({
        candidateCount: 5,
        prepared,
        requestCount: 2,
        status: 'ready',
      });
    const onPrepared = vi.fn();

    const { result } = renderHook(() =>
      useNotionImport({
        analysisDelayMs: 0,
        api,
        initialConnectionId: CONNECTION_ID,
        onPrepared,
      })
    );

    await waitFor(() => expect(result.current.stage).toBe('ready'));
    expect(api.status).toHaveBeenCalledWith(
      CONNECTION_ID,
      expect.any(AbortSignal)
    );
    expect(api.analyze).toHaveBeenCalledTimes(2);
    expect(onPrepared).toHaveBeenCalledWith(prepared);
    expect(result.current.workspaceName).toBe('팀 문서');
    expect(result.current.candidateCount).toBe(5);
  });

  it('field mapping이 필요하면 멈추고 사용자 선택으로 같은 연결을 계속한다', async () => {
    const api = createApi();
    api.status.mockResolvedValue({
      connectionId: CONNECTION_ID,
      includePageUrls: false,
      jobId: CONNECTION_ID,
      jobStatus: 'analyzing',
      status: 'connected',
      workspaceName: null,
    });
    api.analyze
      .mockResolvedValueOnce({
        candidateCount: 0,
        mappingRequests: [
          {
            dataSourceId: 'data-source-id',
            fields: [
              { id: 'url-field', name: 'URL', type: 'url' },
              { id: 'text-field', name: '링크', type: 'rich_text' },
            ],
            suggestedUrlPropertyId: 'url-field',
          },
        ],
        requestCount: 2,
        status: 'mapping-required',
      })
      .mockResolvedValueOnce({
        candidateCount: 1,
        prepared: createPreparedImport(),
        requestCount: 2,
        status: 'ready',
      });
    const onPrepared = vi.fn();
    const { result } = renderHook(() =>
      useNotionImport({
        analysisDelayMs: 0,
        api,
        initialConnectionId: CONNECTION_ID,
        onPrepared,
      })
    );

    await waitFor(() => expect(result.current.stage).toBe('mapping'));
    await act(() =>
      result.current.submitMappings([
        {
          dataSourceId: 'data-source-id',
          memoPropertyId: null,
          titlePropertyId: null,
          urlPropertyId: 'text-field',
        },
      ])
    );

    await waitFor(() => expect(result.current.stage).toBe('ready'));
    expect(api.analyze).toHaveBeenLastCalledWith(
      CONNECTION_ID,
      [
        {
          dataSourceId: 'data-source-id',
          memoPropertyId: null,
          titlePropertyId: null,
          urlPropertyId: 'text-field',
        },
      ],
      expect.any(AbortSignal)
    );
  });

  it('Android 연결은 시스템 브라우저를 열고 callback connection으로 재개한다', async () => {
    const api = createApi();
    api.start.mockResolvedValue({
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      connectionId: CONNECTION_ID,
    });
    api.status.mockResolvedValue({
      connectionId: CONNECTION_ID,
      includePageUrls: true,
      jobId: CONNECTION_ID,
      jobStatus: 'ready',
      status: 'connected',
      workspaceName: null,
    });
    api.analyze.mockResolvedValue({
      candidateCount: 1,
      prepared: createPreparedImport(),
      requestCount: 1,
      status: 'ready',
    });
    let callbackListener: ((connectionId: string) => void) | undefined;
    const callback = {
      open: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn((listener: (connectionId: string) => void) => {
        callbackListener = listener;
        return vi.fn();
      }),
    };
    const onPrepared = vi.fn();
    const { result } = renderHook(() =>
      useNotionImport({
        analysisDelayMs: 0,
        api,
        callback,
        onPrepared,
      })
    );

    await act(() => result.current.start(true));
    expect(callback.open).toHaveBeenCalledWith(
      'https://api.notion.com/v1/oauth/authorize'
    );
    act(() => callbackListener?.(CONNECTION_ID));
    await waitFor(() => expect(result.current.stage).toBe('ready'));
  });
});

function createApi() {
  return {
    analyze: vi.fn<NotionImportApi['analyze']>(),
    cancel: vi.fn<NotionImportApi['cancel']>(),
    complete: vi.fn<NotionImportApi['complete']>(),
    start: vi.fn<NotionImportApi['start']>(),
    status: vi.fn<NotionImportApi['status']>(),
  };
}

function createPreparedImport(): PreparedImport {
  return {
    adapterKey: 'notion',
    collections: [],
    expiresAt: '2026-07-26T00:00:00.000Z',
    id: CONNECTION_ID,
    items: [],
    status: 'ready',
    summary: {
      createdCount: 0,
      duplicateCount: 0,
      excludedCount: 0,
      inputDuplicateCount: 0,
      newCount: 1,
      totalCount: 1,
    },
  };
}
