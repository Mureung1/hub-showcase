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
            dataSourceName: '팀 자료',
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

  it('OAuth 거절 callback은 API를 호출하지 않고 다시 연결할 수 있게 안내한다', async () => {
    const api = createApi();
    const onConnectionFinished = vi.fn();

    const { result } = renderHook(() =>
      useNotionImport({
        api,
        initialConnectionId: CONNECTION_ID,
        initialError: 'access-denied',
        onConnectionFinished,
        onPrepared: vi.fn(),
      } as Parameters<typeof useNotionImport>[0] & {
        initialError: 'access-denied';
        onConnectionFinished(): void;
      })
    );

    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(result.current.errorMessage).toBe(
      'Notion 연결이 승인되지 않았어요. 다시 연결해 주세요.'
    );
    expect(api.status).not.toHaveBeenCalled();
    expect(api.analyze).not.toHaveBeenCalled();
    expect(onConnectionFinished).toHaveBeenCalledTimes(1);
  });

  it('종료된 연결은 분석하지 않고 callback 상태를 정리한다', async () => {
    const api = createApi();
    api.status.mockResolvedValue({
      connectionId: CONNECTION_ID,
      includePageUrls: false,
      jobId: CONNECTION_ID,
      jobStatus: 'failed',
      status: 'failed',
      workspaceName: null,
    });
    const onConnectionFinished = vi.fn();

    const { result } = renderHook(() =>
      useNotionImport({
        api,
        initialConnectionId: CONNECTION_ID,
        onConnectionFinished,
        onPrepared: vi.fn(),
      } as Parameters<typeof useNotionImport>[0] & {
        onConnectionFinished(): void;
      })
    );

    await waitFor(() => expect(result.current.stage).toBe('error'));
    expect(result.current.errorMessage).toBe(
      '완료되지 않은 Notion 연결이에요. 다시 연결해 주세요.'
    );
    expect(api.analyze).not.toHaveBeenCalled();
    expect(onConnectionFinished).toHaveBeenCalledTimes(1);
  });

  it('렌더마다 callback 함수가 바뀌어도 진행 중인 분석을 취소하지 않는다', async () => {
    const api = createApi();
    let finishAnalysis:
      | ((value: Awaited<ReturnType<NotionImportApi['analyze']>>) => void)
      | undefined;
    api.status.mockResolvedValue({
      connectionId: CONNECTION_ID,
      includePageUrls: false,
      jobId: CONNECTION_ID,
      jobStatus: 'analyzing',
      status: 'connected',
      workspaceName: null,
    });
    api.analyze.mockReturnValue(
      new Promise((resolve) => {
        finishAnalysis = resolve;
      })
    );
    const onPrepared = vi.fn();
    const { rerender, result } = renderHook(() =>
      useNotionImport({
        api,
        initialConnectionId: CONNECTION_ID,
        onConnectionFinished: () => undefined,
        onPrepared: (prepared) => onPrepared(prepared),
      })
    );

    await waitFor(() => expect(api.analyze).toHaveBeenCalledTimes(1));
    rerender();
    const analysisSignal = api.analyze.mock.calls[0]?.[2];
    expect(analysisSignal).toBeInstanceOf(AbortSignal);
    expect(analysisSignal?.aborted).toBe(false);
    finishAnalysis?.({
      candidateCount: 1,
      prepared: createPreparedImport(),
      requestCount: 1,
      status: 'ready',
    });

    await waitFor(() => expect(result.current.stage).toBe('ready'));
    expect(onPrepared).toHaveBeenCalledTimes(1);
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
