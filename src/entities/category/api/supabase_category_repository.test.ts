import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createSupabaseCategoryRepository } from './supabase_category_repository';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const CATEGORY_ID = '20000000-0000-4000-8000-000000000001';
const CATEGORY = {
  colorKey: 'blue-2' as const,
  createdAt: '2026-07-24T00:00:00.000Z',
  id: CATEGORY_ID,
  name: '프론트엔드 자료',
  sortOrder: 2,
  updatedAt: '2026-07-24T01:00:00.000Z',
};
const ROW = {
  color_key: CATEGORY.colorKey,
  created_at: CATEGORY.createdAt,
  id: CATEGORY.id,
  name: CATEGORY.name,
  sort_order: CATEGORY.sortOrder,
  updated_at: CATEGORY.updatedAt,
  user_id: USER_ID,
};

describe('createSupabaseCategoryRepository', () => {
  it('행을 변환하고 정규화한 이름과 색상을 저장한 뒤 삭제 RPC를 호출한다', async () => {
    const listOrder = vi.fn();
    const listQuery = {
      eq: vi.fn(),
      order: listOrder,
    };
    listQuery.eq.mockReturnValue(listQuery);
    listOrder
      .mockReturnValueOnce(listQuery)
      .mockReturnValueOnce(listQuery)
      .mockResolvedValueOnce({
        data: [ROW, { ...ROW, color_key: 'unknown' }],
        error: null,
      });

    const listSelect = vi.fn(() => listQuery);
    const single = vi.fn().mockResolvedValue({ data: ROW, error: null });
    const createSelect = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: createSelect }));
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: listSelect })
      .mockReturnValueOnce({ insert });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repository = createSupabaseCategoryRepository(
      { from, rpc } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(repository.list()).resolves.toEqual({
      categories: [CATEGORY],
      warnings: ['corrupted-entry'],
    });
    expect(listQuery.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(listOrder).toHaveBeenNthCalledWith(1, 'sort_order', {
      ascending: true,
    });
    expect(listOrder).toHaveBeenNthCalledWith(2, 'created_at', {
      ascending: true,
    });
    expect(listOrder).toHaveBeenNthCalledWith(3, 'id', { ascending: true });

    await expect(
      repository.create(
        { colorKey: 'blue-2', name: '  프론트엔드   자료  ' },
        2
      )
    ).resolves.toEqual({ category: CATEGORY, ok: true });
    expect(insert).toHaveBeenCalledWith({
      color_key: 'blue-2',
      name: '프론트엔드 자료',
      sort_order: 2,
      user_id: USER_ID,
    });

    await expect(repository.delete(CATEGORY_ID)).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('delete_user_category', {
      target_category_id: CATEGORY_ID,
    });
  });

  it.each([
    ['23505', 'duplicate'],
    ['42501', 'permission-denied'],
  ] as const)('생성 오류 %s를 %s 결과로 변환한다', async (code, reason) => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code, details: '', hint: '', message: '내부 오류' },
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = createSupabaseCategoryRepository(
      { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(
      repository.create({ colorKey: 'blue-2', name: '개발' }, 0)
    ).resolves.toEqual({ ok: false, reason });
  });

  it('사용자와 카테고리 ID를 함께 제한해 정규화한 값으로 수정한다', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: ROW, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const query = { eq: vi.fn(), select };
    query.eq.mockReturnValue(query);
    const update = vi.fn(() => query);
    const repository = createSupabaseCategoryRepository(
      {
        from: vi.fn(() => ({ update })),
      } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(
      repository.update(CATEGORY_ID, {
        colorKey: 'blue-2',
        name: '  프론트엔드   자료 ',
      })
    ).resolves.toEqual({ category: CATEGORY, ok: true });
    expect(update).toHaveBeenCalledWith({
      color_key: 'blue-2',
      name: '프론트엔드 자료',
    });
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', CATEGORY_ID);
    expect(query.eq).toHaveBeenNthCalledWith(2, 'user_id', USER_ID);
  });

  it('잘못된 이름과 색상은 외부 요청 전에 거부한다', async () => {
    const from = vi.fn();
    const repository = createSupabaseCategoryRepository(
      { from } as unknown as SupabaseClient,
      USER_ID
    );

    await expect(
      repository.create(
        {
          colorKey: 'unknown' as 'blue-2',
          name: ' ',
        },
        0
      )
    ).resolves.toEqual({ ok: false, reason: 'invalid-input' });
    expect(from).not.toHaveBeenCalled();
  });
});
