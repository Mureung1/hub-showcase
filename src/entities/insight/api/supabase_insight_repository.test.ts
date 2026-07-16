import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createSupabaseInsightRepository } from './supabase_insight_repository';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const INSIGHT = {
  category: '개발',
  createdAt: '2026-07-15T00:00:00.000Z',
  domain: 'example.com',
  id: '10000000-0000-4000-8000-000000000001',
  memo: '다시 볼 자료',
  normalizedUrl: 'https://example.com/article',
  originalUrl: 'https://example.com/article?utm_source=test',
  title: '예제 자료',
  titleOrigin: 'capture' as const,
  updatedAt: '2026-07-15T01:00:00.000Z',
};

const ROW = {
  category: INSIGHT.category,
  created_at: INSIGHT.createdAt,
  domain: INSIGHT.domain,
  id: INSIGHT.id,
  memo: INSIGHT.memo,
  normalized_url: INSIGHT.normalizedUrl,
  original_url: INSIGHT.originalUrl,
  schema_version: 1,
  title: INSIGHT.title,
  title_origin: INSIGHT.titleOrigin,
  updated_at: INSIGHT.updatedAt,
  user_id: USER_ID,
};

describe('createSupabaseInsightRepository', () => {
  it('사용자 인사이트를 최신 생성 순서로 조회하고 도메인 모델로 변환한다', async () => {
    const order = vi.fn().mockResolvedValue({ data: [ROW], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const repository = createSupabaseInsightRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.list()).resolves.toEqual({
      insights: [INSIGHT],
      warnings: [],
    });
    expect(from).toHaveBeenCalledWith('insights');
    expect(eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it.each([
    ['42501', 'permission-denied'],
    ['PGRST000', 'read-failed'],
  ] as const)(
    '조회 오류 %s를 안전한 경고로 변환한다',
    async (code, warning) => {
      const order = vi.fn().mockResolvedValue({
        data: null,
        error: { code, details: '', hint: '', message: '내부 오류' },
      });
      const repository = createSupabaseInsightRepository(
        createListClient(order),
        USER_ID
      );

      await expect(repository.list()).resolves.toEqual({
        insights: [],
        warnings: [warning],
      });
    }
  );

  it('조회 요청 자체가 거부되어도 read-failed 경고로 반환한다', async () => {
    const order = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const repository = createSupabaseInsightRepository(
      createListClient(order),
      USER_ID
    );

    await expect(repository.list()).resolves.toEqual({
      insights: [],
      warnings: ['read-failed'],
    });
  });

  it('다른 사용자 행과 손상된 행을 노출하지 않고 경고한다', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        null,
        { ...ROW, user_id: '00000000-0000-4000-8000-000000000002' },
        { ...ROW, title: '' },
      ],
      error: null,
    });
    const repository = createSupabaseInsightRepository(
      createListClient(order),
      USER_ID
    );

    await expect(repository.list()).resolves.toEqual({
      insights: [],
      warnings: ['corrupted-entry'],
    });
  });

  it('생성 응답 행이 없으면 예외 대신 write-failed를 반환한다', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = createSupabaseInsightRepository(
      { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.create(INSIGHT)).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
  });

  it('사용자 ID와 스키마 버전을 포함해 인사이트를 생성한다', async () => {
    const single = vi.fn().mockResolvedValue({ data: ROW, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const repository = createSupabaseInsightRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.create(INSIGHT)).resolves.toEqual({
      insight: INSIGHT,
      ok: true,
    });
    expect(insert).toHaveBeenCalledWith({
      category: INSIGHT.category,
      domain: INSIGHT.domain,
      id: INSIGHT.id,
      memo: INSIGHT.memo,
      normalized_url: INSIGHT.normalizedUrl,
      original_url: INSIGHT.originalUrl,
      schema_version: 1,
      title: INSIGHT.title,
      title_origin: INSIGHT.titleOrigin,
      user_id: USER_ID,
    });
  });

  it.each([
    ['23505', 'duplicate'],
    ['42501', 'permission-denied'],
    ['PGRST000', 'write-failed'],
  ] as const)('생성 오류 %s를 %s 결과로 변환한다', async (code, reason) => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code, details: '', hint: '', message: '내부 오류' },
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const repository = createSupabaseInsightRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.create(INSIGHT)).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it('생성 요청 자체가 거부되어도 write-failed로 반환한다', async () => {
    const single = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = createSupabaseInsightRepository(
      { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.create(INSIGHT)).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
  });

  it('사용자와 인사이트 ID를 함께 제한해 수정하고 서버 값을 반환한다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: ROW, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const update = vi.fn(() => query);
    const from = vi.fn(() => ({ update }));
    const repository = createSupabaseInsightRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.update(INSIGHT)).resolves.toEqual({
      insight: INSIGHT,
      ok: true,
    });
    expect(update).toHaveBeenCalledWith({
      category: INSIGHT.category,
      domain: INSIGHT.domain,
      memo: INSIGHT.memo,
      normalized_url: INSIGHT.normalizedUrl,
      original_url: INSIGHT.originalUrl,
      schema_version: 1,
      title: INSIGHT.title,
      title_origin: INSIGHT.titleOrigin,
    });
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', INSIGHT.id);
    expect(query.eq).toHaveBeenNthCalledWith(2, 'user_id', USER_ID);
  });

  it('수정 대상이 보이지 않으면 not-found를 반환한다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const from = vi.fn(() => ({ update: vi.fn(() => query) }));
    const repository = createSupabaseInsightRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.update(INSIGHT)).resolves.toEqual({
      ok: false,
      reason: 'not-found',
    });
  });

  it.each([
    ['23505', 'duplicate'],
    ['42501', 'permission-denied'],
    ['PGRST000', 'write-failed'],
  ] as const)('수정 오류 %s를 %s 결과로 변환한다', async (code, reason) => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code, details: '', hint: '', message: '내부 오류' },
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const repository = createSupabaseInsightRepository(
      {
        from: vi.fn(() => ({ update: vi.fn(() => query) })),
      } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.update(INSIGHT)).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it('수정 요청 자체가 거부되어도 write-failed로 반환한다', async () => {
    const maybeSingle = vi
      .fn()
      .mockRejectedValue(new TypeError('fetch failed'));
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const repository = createSupabaseInsightRepository(
      {
        from: vi.fn(() => ({ update: vi.fn(() => query) })),
      } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.update(INSIGHT)).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
  });

  it('사용자와 인사이트 ID를 함께 제한해 삭제한다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: INSIGHT.id },
      error: null,
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const remove = vi.fn(() => query);
    const from = vi.fn(() => ({ delete: remove }));
    const repository = createSupabaseInsightRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.delete(INSIGHT.id)).resolves.toEqual({ ok: true });
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', INSIGHT.id);
    expect(query.eq).toHaveBeenNthCalledWith(2, 'user_id', USER_ID);
  });

  it.each([
    ['42501', 'permission-denied'],
    ['PGRST000', 'write-failed'],
  ] as const)('삭제 오류 %s를 %s 결과로 변환한다', async (code, reason) => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code, details: '', hint: '', message: '내부 오류' },
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const from = vi.fn(() => ({ delete: vi.fn(() => query) }));
    const repository = createSupabaseInsightRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.delete(INSIGHT.id)).resolves.toEqual({
      ok: false,
      reason,
    });
  });

  it('삭제 요청 자체가 거부되어도 write-failed로 반환한다', async () => {
    const maybeSingle = vi
      .fn()
      .mockRejectedValue(new TypeError('fetch failed'));
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const repository = createSupabaseInsightRepository(
      {
        from: vi.fn(() => ({ delete: vi.fn(() => query) })),
      } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.delete(INSIGHT.id)).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
  });
});

function createListClient(order: ReturnType<typeof vi.fn>) {
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { from } as unknown as SupabaseClient;
}
