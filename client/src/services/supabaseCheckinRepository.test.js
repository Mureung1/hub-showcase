import { describe, expect, test, vi } from 'vitest'
import { createSupabaseCheckinRepository } from './supabaseCheckinRepository'

const USER_ID = '11111111-1111-1111-1111-111111111111'

function authMock() {
  return {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    }),
  }
}

describe('Supabase 체크인 저장소', () => {
  test('로그인 사용자의 기록만 조회한다', async () => {
    const row = {
      id: 'record-1',
      user_id: USER_ID,
      raw_text: '클라우드 기록',
      emotion: '',
      cause: '',
      action: '',
      mood: null,
      image_url: null,
      created_at: '2026-07-27T01:00:00.000Z',
      updated_at: '2026-07-27T01:00:00.000Z',
    }
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockResolvedValue({ data: [row], error: null })
    const supabaseClient = {
      auth: authMock(),
      from: vi.fn().mockReturnValue(query),
    }

    const records = await createSupabaseCheckinRepository(supabaseClient).getCheckins()

    expect(query.eq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(records[0]).toMatchObject({
      id: 'record-1',
      rawText: '클라우드 기록',
      storageMode: 'cloud',
    })
  })

  test('게스트 기록은 원본 ID로 중복 방지하고 사진을 제외해 복사한다', async () => {
    const query = {
      upsert: vi.fn(),
      select: vi.fn(),
    }
    query.upsert.mockReturnValue(query)
    query.select.mockResolvedValue({ data: [], error: null })
    const supabaseClient = {
      auth: authMock(),
      from: vi.fn().mockReturnValue(query),
    }
    const repository = createSupabaseCheckinRepository(supabaseClient)

    await repository.syncGuestCheckins([{
      id: 'local-record-1',
      rawText: '기기에 있던 기록',
      emotion: '긴장',
      cause: '발표',
      action: '목차 적기',
      mood: '😐',
      imageUrl: 'data:image/png;base64,aGFydQ==',
      createdAt: '2026-07-27T01:00:00.000Z',
    }])

    expect(query.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({
        user_id: USER_ID,
        client_record_id: 'local-record-1',
        raw_text: '기기에 있던 기록',
        image_url: null,
      })],
      { onConflict: 'user_id,client_record_id' },
    )
  })
})
