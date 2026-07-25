import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  rows: [] as { id: string; deadline: string }[],
  deletedIds: null as string[] | null,
}))

vi.mock('./supabase.js', () => ({
  SUBSIDIES_TABLE: 'subsidies',
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: state.rows, error: null }),
        }),
      }),
      delete: () => ({
        in: (_column: string, ids: string[]) => {
          state.deletedIds = ids
          return Promise.resolve({ error: null })
        },
      }),
    }),
  },
}))

import { recomputeDday, sweepExpired } from './sweep.js'

const NOW = new Date(2026, 6, 25) // 2026-07-25

describe('recomputeDday', () => {
  it('저장된 날짜 포맷("YYYY. M. D")에서 오늘 기준 dday를 다시 계산한다', () => {
    expect(recomputeDday('2026. 7. 30', NOW)).toBe(5)
  })

  it('이미 지난 날짜는 음수를 반환한다', () => {
    expect(recomputeDday('2026. 7. 1', NOW)).toBe(-24)
  })

  it('"상시 접수" 같은 비-날짜 텍스트는 null을 반환한다(정리 대상 아님)', () => {
    expect(recomputeDday('상시 접수', NOW)).toBeNull()
  })

  it('파싱 실패한 원문 그대로(예: 하이픈이 아닌 다른 구분자)도 null을 반환한다', () => {
    expect(recomputeDday('2020.01.01 ~ 2026.12.31', NOW)).toBeNull()
  })
})

describe('sweepExpired', () => {
  beforeEach(() => {
    state.rows = []
    state.deletedIds = null
  })

  it('마감 지난 공고만 삭제 대상으로 골라 삭제한다', async () => {
    state.rows = [
      { id: 'expired-1', deadline: '2026. 7. 1' },
      { id: 'active-1', deadline: '2026. 8. 1' },
      { id: 'no-deadline-1', deadline: '상시 접수' },
    ]
    const result = await sweepExpired(NOW)
    expect(result.deleted).toBe(1)
    expect(state.deletedIds).toEqual(['expired-1'])
  })

  it('마감 지난 공고가 없으면 삭제를 호출하지 않는다', async () => {
    state.rows = [{ id: 'active-1', deadline: '2026. 8. 1' }]
    const result = await sweepExpired(NOW)
    expect(result.deleted).toBe(0)
    expect(state.deletedIds).toBeNull()
  })
})
