/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImportSourceAdapter } from './import_adapter';
import type {
  ImportServiceResult,
  InsightImportService,
  PrepareImportInput,
} from './insight_import_service';
import type { ImportHistoryEntry, PreparedImport } from './import_types';
import {
  createFileImportIdempotencyKey,
  createImportIdempotencyKey,
  useInsightImport,
} from './use_insight_import';

const JOB_ID = '10000000-0000-4000-8000-000000000001';
const EXPIRES_AT = '2026-07-26T03:00:00.000Z';

describe('useInsightImport', () => {
  it('붙여넣기 분석부터 반영과 Undo까지 상태를 전이한다', async () => {
    const service = createService();
    const onCategoriesChanged = vi.fn();
    const onLibraryChanged = vi.fn();
    service.prepare.mockImplementation(async (input: PrepareImportInput) => ({
      ok: true,
      value: createPreparedImport(input),
    }));
    service.commit.mockResolvedValue({
      ok: true,
      value: {
        createdCount: 1,
        duplicateCount: 0,
        excludedCount: 0,
        jobId: JOB_ID,
      },
    });
    service.undo.mockResolvedValue({
      ok: true,
      value: {
        alreadyDeletedCount: 0,
        deletedCount: 1,
        jobId: JOB_ID,
        preservedCount: 0,
      },
    });
    const { result } = renderHook(() =>
      useInsightImport({
        onCategoriesChanged,
        onLibraryChanged,
        service,
      })
    );

    expect(result.current.stage).toBe('source');

    await act(() =>
      result.current.analyzePastedText(
        'https://example.com/a\nhttps://example.com/a'
      )
    );

    expect(result.current.stage).toBe('preview');
    expect(result.current.prepared?.summary).toMatchObject({
      inputDuplicateCount: 1,
      newCount: 1,
    });

    await act(() => result.current.commit());

    expect(result.current.stage).toBe('result');
    expect(result.current.result?.jobId).toBe(JOB_ID);
    expect(onLibraryChanged).toHaveBeenCalledTimes(1);
    expect(onCategoriesChanged).toHaveBeenCalledTimes(1);

    await act(() => result.current.undo(JOB_ID));

    expect(result.current.result?.undo).toMatchObject({ deletedCount: 1 });
    expect(onLibraryChanged).toHaveBeenCalledTimes(2);
  });

  it('분석 중 두 번째 입력을 막고 취소 뒤 늦은 결과를 무시한다', async () => {
    const deferred = createDeferred<ImportServiceResult<PreparedImport>>();
    const service = createService();
    service.prepare.mockReturnValue(deferred.promise);
    const { result } = renderHook(() => useInsightImport({ service }));

    let firstAnalysis!: Promise<void>;
    act(() => {
      firstAnalysis = result.current.analyzePastedText(
        'https://example.com/first'
      );
    });
    await act(() =>
      result.current.analyzePastedText('https://example.com/second')
    );

    expect(result.current.stage).toBe('analyzing');
    await waitFor(() => expect(service.prepare).toHaveBeenCalledTimes(1));

    act(() => result.current.cancelCurrentOperation());
    expect(result.current.stage).toBe('source');

    deferred.resolve({
      ok: true,
      value: createPreparedImport(
        service.prepare.mock.calls[0]?.[0] as PrepareImportInput
      ),
    });
    await act(() => firstAnalysis);

    expect(result.current.stage).toBe('source');
  });

  it('반영 실패 뒤 미리보기와 사용자가 고른 매핑을 보존한다', async () => {
    const service = createService();
    service.prepare.mockResolvedValue({
      ok: true,
      value: createPreparedWithCollection(),
    });
    service.commit.mockResolvedValue({
      ok: false,
      reason: 'write-failed',
    });
    const { result } = renderHook(() => useInsightImport({ service }));

    await act(() =>
      result.current.analyzePastedText('https://example.com/article')
    );
    act(() =>
      result.current.setCollectionMapping({
        collectionKey: '["개발"]',
        target: {
          categoryId: '20000000-0000-4000-8000-000000000001',
          kind: 'existing',
        },
      })
    );
    await act(() => result.current.commit());

    expect(result.current.stage).toBe('preview');
    expect(result.current.mappings).toEqual([
      {
        collectionKey: '["개발"]',
        target: {
          categoryId: '20000000-0000-4000-8000-000000000001',
          kind: 'existing',
        },
      },
    ]);
    expect(result.current.errorMessage).toBe(
      '가져오기를 완료하지 못했습니다. 다시 시도해 주세요.'
    );
  });

  it('신규 항목이 없으면 반영을 시작하지 않는다', async () => {
    const service = createService();
    service.prepare.mockResolvedValue({
      ok: true,
      value: {
        ...createPreparedWithCollection(),
        summary: {
          createdCount: 0,
          duplicateCount: 1,
          excludedCount: 0,
          inputDuplicateCount: 0,
          newCount: 0,
          totalCount: 1,
        },
      },
    });
    const { result } = renderHook(() => useInsightImport({ service }));

    await act(() =>
      result.current.analyzePastedText('https://example.com/article')
    );
    expect(result.current.canCommit).toBe(false);

    await act(() => result.current.commit());

    expect(service.commit).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('preview');
  });

  it('어댑터와 NUL, 원문 UTF-8 바이트로 멱등성 키를 만든다', async () => {
    await expect(
      createImportIdempotencyKey('pasted-text', 'https://example.com/한글')
    ).resolves.toBe(
      'b098b941c798336fb8cb77a6274d8c81c9e901402a3b01316f0fa3fcc63de460'
    );
  });

  it('파일 후보와 정렬한 필드 매핑, 원본 바이트 해시만 준비 요청으로 넘긴다', async () => {
    const service = createService();
    const adapter: ImportSourceAdapter = {
      detect: vi.fn().mockResolvedValue({
        adapterKey: 'generic-text',
        confidence: 1,
        mappingRequests: null,
      }),
      extract: vi.fn().mockResolvedValue([
        {
          candidateId: 'generic-text:0',
          capturedAtCandidate: null,
          collectionPath: [],
          explicitMemoCandidate: null,
          originalUrl: 'https://example.com/file',
          sourceLocation: '1번째 줄',
          titleCandidate: null,
          warnings: ['missing-title'],
        },
      ]),
    };
    const mappings = [
      {
        memoField: null,
        sourceKey: 'z',
        titleField: null,
        urlField: 'url',
      },
      {
        memoField: 'memo',
        sourceKey: 'a',
        titleField: 'title',
        urlField: 'link',
      },
    ];
    const file = new File(['https://example.com/file'], 'links.txt');
    service.prepare.mockImplementation(async (input: PrepareImportInput) => ({
      ok: true,
      value: createPreparedImport(input),
    }));
    const { result } = renderHook(() =>
      useInsightImport({ fileAdapters: [adapter], service })
    );

    await act(() => result.current.analyzeFile(file, mappings));

    expect(result.current.stage).toBe('preview');
    expect(service.prepare).toHaveBeenCalledWith({
      adapterKey: 'generic-text',
      idempotencyKey: await createFileImportIdempotencyKey(
        'generic-text',
        file,
        mappings
      ),
      inputKind: 'file',
      items: expect.any(Array),
    });
    expect(JSON.stringify(service.prepare.mock.calls[0]?.[0])).not.toContain(
      'links.txt'
    );
  });

  it('모호한 파일의 매핑 요청 뒤 같은 파일로 분석을 이어간다', async () => {
    const service = createService();
    const adapter: ImportSourceAdapter = {
      detect: vi.fn().mockImplementation(async (input) => ({
        adapterKey: 'generic-csv',
        confidence: 1,
        mappingRequests:
          input.kind === 'file' && input.mappings
            ? null
            : [
                {
                  fields: ['url', 'link'],
                  sourceKey: 'file',
                  suggested: {
                    memoField: null,
                    sourceKey: 'file',
                    titleField: null,
                    urlField: 'url',
                  },
                },
              ],
      })),
      extract: vi.fn().mockResolvedValue([
        {
          candidateId: 'generic-csv:0',
          capturedAtCandidate: null,
          collectionPath: [],
          explicitMemoCandidate: null,
          originalUrl: 'https://example.com/file',
          sourceLocation: 'CSV 2번째 행',
          titleCandidate: null,
          warnings: ['missing-title'],
        },
      ]),
    };
    service.prepare.mockImplementation(async (input: PrepareImportInput) => ({
      ok: true,
      value: createPreparedImport(input),
    }));
    const { result } = renderHook(() =>
      useInsightImport({ fileAdapters: [adapter], service })
    );

    await act(() =>
      result.current.analyzeFile(new File(['url,link'], 'links.csv'))
    );

    expect(result.current.stage).toBe('field-mapping');
    expect(result.current.fieldMappingRequests).toHaveLength(1);
    expect(adapter.extract).not.toHaveBeenCalled();

    await act(() =>
      result.current.submitFieldMappings([
        {
          memoField: null,
          sourceKey: 'file',
          titleField: null,
          urlField: 'link',
        },
      ])
    );

    expect(result.current.stage).toBe('preview');
    expect(adapter.extract).toHaveBeenCalledTimes(1);
  });

  it('기록 새로고침 실패가 현재 미리보기를 지우지 않는다', async () => {
    const service = createService();
    service.prepare.mockResolvedValue({
      ok: true,
      value: createPreparedWithCollection(),
    });
    service.listHistory.mockResolvedValue({
      ok: false,
      reason: 'read-failed',
    });
    const { result } = renderHook(() => useInsightImport({ service }));

    await act(() =>
      result.current.analyzePastedText('https://example.com/article')
    );
    await act(() => result.current.refreshHistory());

    expect(result.current.stage).toBe('preview');
    expect(result.current.prepared?.id).toBe(JOB_ID);
    expect(result.current.historyErrorMessage).toBe(
      '가져오기 기록을 불러오지 못했습니다.'
    );
  });

  it('기록 삭제 성공 시 해당 기록만 목록에서 제거한다', async () => {
    const service = createService();
    const history = createHistoryEntry();
    service.listHistory.mockResolvedValue({ ok: true, value: [history] });
    service.deleteRecord.mockResolvedValue({ ok: true, value: undefined });
    const { result } = renderHook(() => useInsightImport({ service }));

    await act(() => result.current.refreshHistory());
    expect(result.current.history).toEqual([history]);

    await act(() => result.current.deleteRecord(JOB_ID));

    expect(result.current.history).toEqual([]);
  });

  it('Undo 만료를 안내하고 해당 기록의 되돌리기 권한을 제거한다', async () => {
    const service = createService();
    service.listHistory.mockResolvedValue({
      ok: true,
      value: [createHistoryEntry()],
    });
    service.undo.mockResolvedValue({
      ok: false,
      reason: 'undo-expired',
    });
    const { result } = renderHook(() => useInsightImport({ service }));

    await act(() => result.current.refreshHistory());
    await act(() => result.current.undo(JOB_ID));

    expect(result.current.errorMessage).toBe(
      '되돌릴 수 있는 24시간이 지났어요.'
    );
    expect(result.current.history[0]?.undoExpiresAt).toBeNull();
    expect(result.current.history[0]?.canUndo).toBe(false);
  });
});

function createService() {
  return {
    commit: vi.fn<InsightImportService['commit']>(),
    deleteRecord: vi.fn<InsightImportService['deleteRecord']>(),
    listHistory: vi.fn<InsightImportService['listHistory']>(),
    listIssues: vi.fn<InsightImportService['listIssues']>(),
    prepare: vi.fn<InsightImportService['prepare']>(),
    retry: vi.fn<InsightImportService['retry']>(),
    undo: vi.fn<InsightImportService['undo']>(),
  };
}

function createPreparedImport(input: PrepareImportInput): PreparedImport {
  const items = input.items.map((item, index) => ({
    ...item,
    classification:
      index === 0 ? ('new' as const) : ('input_duplicate' as const),
  }));

  return {
    adapterKey: input.adapterKey,
    collections: [],
    expiresAt: EXPIRES_AT,
    id: JOB_ID,
    items,
    status: 'ready',
    summary: {
      createdCount: 0,
      duplicateCount: 0,
      excludedCount: 0,
      inputDuplicateCount: Math.max(0, items.length - 1),
      newCount: items.length > 0 ? 1 : 0,
      totalCount: items.length,
    },
  };
}

function createPreparedWithCollection(): PreparedImport {
  return {
    adapterKey: 'pasted-text',
    collections: [['개발']],
    expiresAt: EXPIRES_AT,
    id: JOB_ID,
    items: [
      {
        candidateId: 'pasted-text:0',
        capturedAtCandidate: null,
        classification: 'new',
        collectionPath: ['개발'],
        domain: 'example.com',
        exclusionCode: null,
        explicitMemoCandidate: null,
        normalizedUrl: 'https://example.com/article',
        originalUrl: 'https://example.com/article',
        sourceLocation: '1번째 줄',
        titleCandidate: null,
        warnings: ['missing-title'],
      },
    ],
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

function createHistoryEntry(): ImportHistoryEntry {
  return {
    adapterKey: 'pasted-text',
    canUndo: true,
    completedAt: '2026-07-25T03:00:00.000Z',
    id: JOB_ID,
    status: 'completed',
    summary: {
      createdCount: 1,
      duplicateCount: 0,
      excludedCount: 0,
      inputDuplicateCount: 0,
      newCount: 1,
      totalCount: 1,
    },
    undoExpiresAt: '2099-07-26T03:00:00.000Z',
    undoResult: null,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}
