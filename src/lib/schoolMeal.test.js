// 안정성 점검(Phase B) — getSchoolMeals가 응답 지연(AbortError)을 "급식 없음"(빈 배열)으로 잘못
// 삼키던 것의 회귀 테스트. searchSchools도 같은 방어가 이미 있어 함께 확인한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSchoolMeals, searchSchools } from './schoolMeal.js'
import { fetchWithTimeout } from './fetchWithTimeout.js'

vi.mock('./fetchWithTimeout.js', () => ({ fetchWithTimeout: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
})

function abortError() {
  const err = new Error('The operation was aborted')
  err.name = 'AbortError'
  return err
}

describe('getSchoolMeals', () => {
  it('정상 응답이면 days를 그대로 반환한다', async () => {
    fetchWithTimeout.mockResolvedValue({ ok: true, json: async () => ({ days: [{ date: '20260728', meals: [] }] }) })
    const result = await getSchoolMeals({ officeCode: 'A', schoolCode: 'B', from: '20260701', to: '20260731' })
    expect(result).toEqual([{ date: '20260728', meals: [] }])
  })

  it('본문을 읽는 도중 타임아웃(AbortError)이 나면 빈 배열이 아니라 에러를 던진다', async () => {
    fetchWithTimeout.mockResolvedValue({ ok: true, json: () => Promise.reject(abortError()) })
    await expect(
      getSchoolMeals({ officeCode: 'A', schoolCode: 'B', from: '20260701', to: '20260731' }),
    ).rejects.toThrow('응답이 지연되고 있습니다')
  })

  it('응답 자체가 실패(!res.ok)면 에러를 던진다', async () => {
    fetchWithTimeout.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: '서버 오류' }) })
    await expect(
      getSchoolMeals({ officeCode: 'A', schoolCode: 'B', from: '20260701', to: '20260731' }),
    ).rejects.toThrow('서버 오류')
  })
})

describe('searchSchools', () => {
  it('2글자 미만이면 요청 없이 빈 배열을 반환한다', async () => {
    expect(await searchSchools('가')).toEqual([])
    expect(fetchWithTimeout).not.toHaveBeenCalled()
  })

  it('AbortError는 그대로 다시 던진다(디바운스 취소 처리용)', async () => {
    fetchWithTimeout.mockResolvedValue({ ok: true, json: () => Promise.reject(abortError()) })
    await expect(searchSchools('충남고등학교')).rejects.toThrow('The operation was aborted')
  })
})
