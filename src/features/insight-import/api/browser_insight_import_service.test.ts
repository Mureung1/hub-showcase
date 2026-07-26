import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { AnalyzedImportItem } from '../model/import_types';
import { createBrowserInsightImportService } from './browser_insight_import_service';

const JOB_ID = '10000000-0000-4000-8000-000000000001';
const COMPLETED_AT = '2026-07-25T03:00:00.000Z';
const EXPIRES_AT = '2026-07-26T03:00:00.000Z';
const UNDO_EXPIRES_AT = '2099-07-26T03:00:00.000Z';
const analyzedItems: AnalyzedImportItem[] = [
  {
    candidateId: 'pasted-text:0',
    capturedAtCandidate: null,
    classification: 'candidate',
    collectionPath: [],
    domain: 'example.com',
    exclusionCode: null,
    explicitMemoCandidate: null,
    normalizedUrl: 'https://example.com/article',
    originalUrl: 'https://example.com/article',
    sourceLocation: '붙여넣기 1행',
    titleCandidate: null,
    warnings: ['missing-title'],
  },
];

const preparedImport = {
  adapterKey: 'pasted-text',
  collections: [],
  expiresAt: EXPIRES_AT,
  id: JOB_ID,
  items: [
    {
      ...analyzedItems[0],
      classification: 'new',
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

describe('createBrowserInsightImportService', () => {
  it('분석 후보를 인증 RPC 입력으로 준비하고 응답을 검증한다', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: preparedImport,
      error: null,
    });
    const service = createBrowserInsightImportService(createClient({ rpc }));

    await expect(
      service.prepare({
        adapterKey: 'pasted-text',
        idempotencyKey: 'a'.repeat(64),
        inputKind: 'pasted-text',
        items: analyzedItems,
      })
    ).resolves.toEqual({ ok: true, value: preparedImport });
    expect(rpc).toHaveBeenCalledWith('prepare_insight_import', {
      p_adapter_key: 'pasted-text',
      p_idempotency_key: 'a'.repeat(64),
      p_input_kind: 'pasted-text',
      p_items: [
        {
          candidateId: 'pasted-text:0',
          capturedAtCandidate: null,
          collectionPath: [],
          domain: 'example.com',
          exclusionCode: null,
          explicitMemoCandidate: null,
          normalizedUrl: 'https://example.com/article',
          originalUrl: 'https://example.com/article',
          sourceLocation: '붙여넣기 1행',
          titleCandidate: null,
          warnings: ['missing-title'],
        },
      ],
    });
  });

  it('반영·재시도·Undo RPC의 입력과 결과를 검증한다', async () => {
    const mapping = {
      collectionKey: '[]',
      target: { kind: 'uncategorized' as const },
    };
    const commitResult = {
      createdCount: 1,
      duplicateCount: 0,
      excludedCount: 0,
      jobId: JOB_ID,
    };
    const undoResult = {
      alreadyDeletedCount: 0,
      deletedCount: 1,
      jobId: JOB_ID,
      preservedCount: 0,
    };
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: commitResult, error: null })
      .mockResolvedValueOnce({ data: commitResult, error: null })
      .mockResolvedValueOnce({ data: undoResult, error: null });
    const service = createBrowserInsightImportService(createClient({ rpc }));

    await expect(service.commit(JOB_ID, [mapping])).resolves.toEqual({
      ok: true,
      value: commitResult,
    });
    await expect(service.retry(JOB_ID, [mapping])).resolves.toEqual({
      ok: true,
      value: commitResult,
    });
    await expect(service.undo(JOB_ID)).resolves.toEqual({
      ok: true,
      value: undoResult,
    });
    expect(rpc).toHaveBeenNthCalledWith(1, 'commit_insight_import', {
      p_collection_mappings: [mapping],
      p_job_id: JOB_ID,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'retry_insight_import', {
      p_collection_mappings: [mapping],
      p_job_id: JOB_ID,
    });
    expect(rpc).toHaveBeenNthCalledWith(3, 'undo_insight_import', {
      p_job_id: JOB_ID,
    });
  });

  it('완료 기록과 Undo 만료 시각을 제한된 열로 최신순 조회한다', async () => {
    const historyQuery = createQuery({
      data: [
        {
          adapter_key: 'pasted-text',
          already_deleted_count: 1,
          completed_at: COMPLETED_AT,
          created_count: 3,
          duplicate_count: 1,
          excluded_count: 1,
          id: JOB_ID,
          input_duplicate_count: 1,
          new_count: 3,
          preserved_count: 1,
          status: 'completed',
          total_count: 6,
          undo_expires_at: UNDO_EXPIRES_AT,
        },
      ],
      error: null,
    });
    const from = vi.fn(() => historyQuery);
    const service = createBrowserInsightImportService(createClient({ from }));

    await expect(service.listHistory()).resolves.toEqual({
      ok: true,
      value: [
        {
          adapterKey: 'pasted-text',
          canUndo: true,
          completedAt: COMPLETED_AT,
          id: JOB_ID,
          status: 'completed',
          summary: {
            createdCount: 3,
            duplicateCount: 1,
            excludedCount: 1,
            inputDuplicateCount: 1,
            newCount: 3,
            totalCount: 6,
          },
          undoExpiresAt: UNDO_EXPIRES_AT,
          undoResult: null,
        },
      ],
    });
    expect(from).toHaveBeenCalledWith('insight_import_jobs');
    expect(historyQuery.select).toHaveBeenCalledTimes(1);
    expect(historyQuery.in).toHaveBeenCalledWith('status', [
      'completed',
      'undone',
    ]);
    expect(historyQuery.order).toHaveBeenCalledWith('completed_at', {
      ascending: false,
    });
    expect(historyQuery.limit).toHaveBeenCalledWith(20);
  });

  it('Undo 만료 응답을 전용 실패 사유로 반환한다', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: false, reason: 'undo-expired' },
      error: null,
    });
    const service = createBrowserInsightImportService(createClient({ rpc }));

    await expect(service.undo(JOB_ID)).resolves.toEqual({
      ok: false,
      reason: 'undo-expired',
    });
  });

  it('오류 항목을 50개씩 조회하고 다음 ordinal을 반환한다', async () => {
    const rows = Array.from({ length: 51 }, (_, index) =>
      createIssueRow(index + 11)
    );
    const issueQuery = createQuery({ data: rows, error: null });
    const service = createBrowserInsightImportService(
      createClient({ from: vi.fn(() => issueQuery) })
    );

    const result = await service.listIssues(JOB_ID, 10);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(50);
      expect(result.value.nextOrdinal).toBe(60);
    }
    expect(issueQuery.eq).toHaveBeenCalledWith('job_id', JOB_ID);
    expect(issueQuery.in).toHaveBeenCalledWith('classification', [
      'excluded',
      'input_duplicate',
    ]);
    expect(issueQuery.gt).toHaveBeenCalledWith('ordinal', 10);
    expect(issueQuery.order).toHaveBeenCalledWith('ordinal', {
      ascending: true,
    });
    expect(issueQuery.limit).toHaveBeenCalledWith(51);
  });

  it('형식이 깨진 RPC와 기록 응답을 read-failed로 거부한다', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          createdCount: -1,
          duplicateCount: 0,
          excludedCount: 0,
          jobId: JOB_ID,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          alreadyDeletedCount: 0,
          deletedCount: -1,
          jobId: JOB_ID,
          preservedCount: 0,
        },
        error: null,
      });
    const historyQuery = createQuery({
      data: [{ id: JOB_ID, status: 'unknown' }],
      error: null,
    });
    const service = createBrowserInsightImportService(
      createClient({
        from: vi.fn(() => historyQuery),
        rpc,
      })
    );

    await expect(
      service.prepare({
        adapterKey: 'pasted-text',
        idempotencyKey: 'a'.repeat(64),
        inputKind: 'pasted-text',
        items: analyzedItems,
      })
    ).resolves.toEqual({ ok: false, reason: 'read-failed' });
    await expect(service.commit(JOB_ID, [])).resolves.toEqual({
      ok: false,
      reason: 'read-failed',
    });
    await expect(service.undo(JOB_ID)).resolves.toEqual({
      ok: false,
      reason: 'read-failed',
    });
    await expect(service.listHistory()).resolves.toEqual({
      ok: false,
      reason: 'read-failed',
    });
  });

  it('기록 삭제의 null 응답만 성공으로 처리한다', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: '42501', message: 'database detail' },
      });
    const service = createBrowserInsightImportService(createClient({ rpc }));

    await expect(service.deleteRecord(JOB_ID)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(service.deleteRecord(JOB_ID)).resolves.toEqual({
      ok: false,
      reason: 'permission-denied',
    });
  });

  it('원자적 반영 실패 응답을 쓰기 실패로 처리한다', async () => {
    const service = createBrowserInsightImportService(
      createClient({
        rpc: vi.fn().mockResolvedValue({
          data: { ok: false, reason: 'commit-failed' },
          error: null,
        }),
      })
    );

    await expect(service.commit(JOB_ID, [])).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
  });

  it.each([
    ['42501', 'permission-denied'],
    ['22023', 'invalid-request'],
    ['50000', 'write-failed'],
  ] as const)(
    'PostgreSQL %s 오류를 안전한 실패 사유로 바꾼다',
    async (code, reason) => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const rpc = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code,
          details: 'SENSITIVE_DATABASE_DETAIL',
          hint: 'SENSITIVE_DATABASE_HINT',
          message: 'SENSITIVE_DATABASE_MESSAGE',
        },
      });
      const service = createBrowserInsightImportService(createClient({ rpc }));

      await expect(service.commit(JOB_ID, [])).resolves.toEqual({
        ok: false,
        reason,
      });
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    }
  );
});

function createIssueRow(ordinal: number) {
  return {
    candidate_id: `candidate:${ordinal}`,
    captured_at_candidate: null,
    classification: 'excluded',
    collection_path: [],
    domain: null,
    exclusion_code: 'invalid-url',
    explicit_memo_candidate: null,
    normalized_url: null,
    ordinal,
    original_url: `invalid-${ordinal}`,
    source_location: `행 ${ordinal}`,
    title_candidate: null,
    warnings: [],
  };
}

function createClient({
  from = vi.fn(),
  rpc = vi.fn(),
}: {
  from?: ReturnType<typeof vi.fn>;
  rpc?: ReturnType<typeof vi.fn>;
}): SupabaseClient {
  return { from, rpc } as unknown as SupabaseClient;
}

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    eq: vi.fn(),
    gt: vi.fn(),
    in: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    then: (
      resolve: (value: typeof result) => unknown,
      reject: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  };

  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.select.mockReturnValue(query);

  return query;
}
