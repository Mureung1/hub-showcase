import { describe, it, expect, vi, beforeEach } from 'vitest'
import { _clearMenuPriorCacheForTest, cleanMenuName, fetchMenuPrior } from './menuPrior.js'
import { getSchoolMeals } from './schoolMeal.js'

vi.mock('./schoolMeal.js', () => ({ getSchoolMeals: vi.fn() }))

const SCHOOL = { officeCode: 'B10', code: '7010084', name: '양서중학교', kind: '중학교' }

function mealsFixture() {
  return [
    {
      mealType: 'lunch',
      menus: ['잡곡밥', '미역국 (5.6)', '돼지갈비찜*', 'H참외', '우유2.5'],
      calories: 812.3,
      nutrients: { protein: 30.1, carbs: 110.2, fat: 22.4, sodium: 1100 },
    },
  ]
}

beforeEach(() => {
  _clearMenuPriorCacheForTest()
  vi.mocked(getSchoolMeals).mockReset()
})

describe('cleanMenuName', () => {
  // NEIS 원문에는 알레르기 번호와 각주 기호가 섞여 있다. 그대로 프롬프트에 넣으면 AI가 그 표기까지
  // 따라 적어 DB 조회가 어긋난다.
  it('알레르기 번호·각주 기호를 벗긴다', () => {
    expect(cleanMenuName('미역국 (5.6)')).toBe('미역국')
    expect(cleanMenuName('돼지갈비찜*')).toBe('돼지갈비찜')
    expect(cleanMenuName('우유2.5')).toBe('우유')
    expect(cleanMenuName('  잡곡밥  ')).toBe('잡곡밥')
  })

  it('음식명 안의 공백은 살린다 — 사람이 읽는 이름이라 DB 매칭 키와 규칙이 다르다', () => {
    expect(cleanMenuName('오징어 덮밥')).toBe('오징어 덮밥')
  })

  it('문자열이 아니면 빈 문자열', () => {
    expect(cleanMenuName(null)).toBe('')
  })
})

describe('fetchMenuPrior', () => {
  it('학교가 없으면 조회하지 않는다', async () => {
    expect(await fetchMenuPrior({ school: null }, 'lunch')).toBeNull()
    expect(getSchoolMeals).not.toHaveBeenCalled()
  })

  it('그 끼니의 메뉴명과 공식 수치를 돌려준다', async () => {
    vi.mocked(getSchoolMeals).mockResolvedValue([{ date: '20260730', meals: mealsFixture() }])
    const prior = await fetchMenuPrior({ school: SCHOOL }, 'lunch')

    expect(prior.names).toEqual(['잡곡밥', '미역국', '돼지갈비찜', '참외', '우유'])
    expect(prior.officialTotals.calories).toBe(812.3)
    expect(prior.schoolKind).toBe('중학교')
  })

  it('해당 끼니가 없으면 null', async () => {
    vi.mocked(getSchoolMeals).mockResolvedValue([{ date: '20260730', meals: mealsFixture() }])
    expect(await fetchMenuPrior({ school: SCHOOL }, 'dinner')).toBeNull()
  })

  // 같은 학교 학생들이 같은 날 찍으면 두 번째부터는 네트워크가 0이어야 한다.
  it('(학교, 날짜)로 캐시해 같은 날 다시 부르지 않는다', async () => {
    vi.mocked(getSchoolMeals).mockResolvedValue([{ date: '20260730', meals: mealsFixture() }])
    await fetchMenuPrior({ school: SCHOOL }, 'lunch')
    await fetchMenuPrior({ school: SCHOOL }, 'lunch')
    expect(getSchoolMeals).toHaveBeenCalledTimes(1)
  })

  // 프라이어는 부가 정보다 — 못 가져와도 분석 자체는 기존 경로로 계속돼야 한다.
  it('조회에 실패해도 던지지 않고 null', async () => {
    vi.mocked(getSchoolMeals).mockRejectedValue(new Error('업스트림 폭발'))
    expect(await fetchMenuPrior({ school: SCHOOL }, 'lunch')).toBeNull()
  })

  // ⚠️ 예전엔 실패를 성공과 같은 캐시에 `[]`로 담아, NEIS가 한 번만 흔들려도 그날 그 학교의
  // closed-set 프라이어·공식 앵커링·판 단위 검증 밴드가 세션 내내 꺼졌다(사용자에겐 아무 표시 없이).
  it('일시 실패는 영구가 아니다 — TTL이 지나면 다시 시도한다', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(getSchoolMeals).mockRejectedValueOnce(new Error('일시 장애'))
      expect(await fetchMenuPrior({ school: SCHOOL }, 'lunch')).toBeNull()

      vi.advanceTimersByTime(61_000)
      vi.mocked(getSchoolMeals).mockResolvedValue([{ date: '20260730', meals: mealsFixture() }])
      const prior = await fetchMenuPrior({ school: SCHOOL }, 'lunch')
      expect(prior?.names?.length).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
    }
  })

  // NEIS가 느린 날 사용자가 분석 스피너를 28초(fetchWithTimeout 기본값) 보고 있으면 안 된다 —
  // 프라이어는 프롬프트에 들어가야 해서 직렬이라, 늦으면 버리고 open-set 경로로 간다.
  it('응답이 느리면 데드라인에 걸려 null로 떨어진다(분석을 붙잡지 않는다)', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(getSchoolMeals).mockImplementation(() => new Promise(() => {}))
      const pending = fetchMenuPrior({ school: SCHOOL }, 'lunch')
      await vi.advanceTimersByTimeAsync(3000)
      expect(await pending).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('공식 열량이 없으면 officialTotals는 null — 0으로 채우지 않는다', async () => {
    vi.mocked(getSchoolMeals).mockResolvedValue([{ date: '20260730', meals: [{ mealType: 'lunch', menus: ['잡곡밥'], calories: 0 }] }])
    const prior = await fetchMenuPrior({ school: SCHOOL }, 'lunch')
    expect(prior.officialTotals).toBeNull()
  })
})
