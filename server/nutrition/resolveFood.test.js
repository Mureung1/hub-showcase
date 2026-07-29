// 통합 해석 엔진(resolveFood.js) 규칙 테스트 — 실제 원격 API를 호출하지 않는다(searchRemote 주입).
// 로컬 DB(foodDB.json / recipeDB.json)는 실물을 그대로 쓴다 — 매칭 전략과 데이터의 상호작용이
// 이 모듈의 핵심이라 목으로 바꾸면 검증 가치가 사라진다.
import { describe, it, expect, vi } from 'vitest'
import { recipeToPer100, resolveFoodItems, RESOLVE_SOURCE } from './resolveFood.js'

function remoteRecord(name, nutrients = {}) {
  return {
    name,
    baseQuantity: { value: 100, unit: 'g', raw: '100g' },
    servSize: null,
    foodSize: null,
    brand: null,
    nutrients: { calories: 120, protein: 2, fat: 3, carbs: 18, fiber: null, sodium: 250, ...nutrients },
  }
}

describe('로컬 우선 해석', () => {
  it('로컬 완전일치는 원격을 아예 호출하지 않는다', async () => {
    const searchRemote = vi.fn()
    const [out] = await resolveFoodItems([{ dbSearchName: '비빔밥' }], { searchRemote })

    expect(searchRemote).not.toHaveBeenCalled()
    expect(out.source).toBe(RESOLVE_SOURCE.DB)
    expect(out.matchType).toBe('exact')
    expect(out.confidence).toBe('high')
  })

  it('식약처 DB가 못 잡는 띄어쓰기 변형("돌솥비빔밥")을 로컬이 완전일치로 잡는다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '돌솥비빔밥', fallbackSearchName: '비빔밥' }])
    expect(out.matchedName).toBe('돌솥 비빔밥')
    expect(out.matchType).toBe('exact')
  })

  it('레시피DB에만 있는 메뉴를 잡고, 1인분 중량을 모르면 confidence를 낮춘다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '가자미쑥국' }])
    expect(out.source).toBe(RESOLVE_SOURCE.RECIPE_DB)
    expect(out.assumedServing).toBe(true)
    expect(out.confidence).toBe('medium') // 수치는 실측이지만 100g 환산이 가정이라 high는 아니다
  })
})

// 이 앱에서 실제로 확인된 오매칭이다 — 로컬 매처의 편집거리(≤2) 단계가 "치킨"에 "제육(돼지고기
// 수육)"을, "파스타"에 "토스트(식빵)"를 물어온다. 예전 findFoodMatch는 이걸 유사도 검증 없이
// 그대로 채택했다. 회귀하면 사용자에게 전혀 다른 음식의 영양수치가 표시된다.
describe('저신뢰 매칭 차단(회귀 방지)', () => {
  it('편집거리로만 걸린 무관한 음식은 채택하지 않고 AI 추정으로 넘긴다', async () => {
    const out = await resolveFoodItems([{ dbSearchName: '치킨' }, { dbSearchName: '파스타' }])
    for (const r of out) {
      expect(r.match).toBeNull()
      expect(r.source).toBe(RESOLVE_SOURCE.ESTIMATED)
    }
  })

  it('원격이 정상 응답하면 그 결과를 유사도 검증 후 채택한다', async () => {
    const searchRemote = vi.fn(async (term, source) => (source === 'food' ? [remoteRecord('치킨')] : []))
    const [out] = await resolveFoodItems([{ dbSearchName: '치킨' }], { searchRemote })

    expect(out.source).toBe(RESOLVE_SOURCE.DB)
    expect(out.matchedName).toBe('치킨')
  })

  it('원격이 무관한 이름을 돌려주면(유사도 미달) 거절한다', async () => {
    const searchRemote = vi.fn(async () => [remoteRecord('치킨무')])
    const [out] = await resolveFoodItems([{ dbSearchName: '치킨' }], { searchRemote })
    // "치킨무"는 startsWith 관계라 유사도 0.3×비율 → 기준(0.7) 미달
    expect(out.match).toBeNull()
  })
})

describe('원격 조회', () => {
  it('미해결 항목만, 음식DB·가공식품DB를 병렬로 조회한다', async () => {
    const searchRemote = vi.fn(async () => [])
    await resolveFoodItems([{ dbSearchName: '비빔밥' }, { dbSearchName: '존재하지않는창작메뉴명xyz' }], { searchRemote })

    // 비빔밥은 로컬에서 끝나므로 원격 호출은 미해결 1건 × 2소스 = 2회뿐
    expect(searchRemote).toHaveBeenCalledTimes(2)
    expect(searchRemote.mock.calls.map((c) => c[1]).sort()).toEqual(['food', 'process'])
  })

  it('원격이 전부 실패해도 예외를 던지지 않고 AI 추정으로 떨어진다', async () => {
    const searchRemote = vi.fn(async () => {
      throw new Error('업스트림 폭발')
    })
    const [out] = await resolveFoodItems([{ dbSearchName: '존재하지않는창작메뉴명xyz' }], { searchRemote })
    expect(out.source).toBe(RESOLVE_SOURCE.ESTIMATED)
  })

  it('데드라인을 넘기면 기다리지 않고 확보한 만큼으로 응답한다', async () => {
    const searchRemote = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve([remoteRecord('느린음식')]), 3000)))
    const startedAt = Date.now()
    const [out] = await resolveFoodItems([{ dbSearchName: '존재하지않는창작메뉴명xyz' }], { searchRemote, deadlineMs: 200 })

    expect(Date.now() - startedAt).toBeLessThan(1500) // 3초를 다 기다리지 않는다
    expect(out.source).toBe(RESOLVE_SOURCE.ESTIMATED)
  })

  it('searchRemote를 주지 않으면 로컬만으로 동작한다(in-process 호출자용)', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '비빔밥' }])
    expect(out.source).toBe(RESOLVE_SOURCE.DB)
  })

  // 코드 리뷰에서 발견 — 검색어를 trim하지 않고 그대로 원격에 넘기면, /api/fooddb 라우트가
  // foodName.trim()으로 만드는 캐시 키와 어긋나 같은 음식이 공백 유무로 서로 다른 캐시 항목이 된다.
  // 식약처 API는 완전일치만 지원해 공백이 남은 검색어는 매칭 자체가 조용히 실패할 수도 있다.
  it('검색어 앞뒤 공백을 trim해서 원격에 넘긴다', async () => {
    const searchRemote = vi.fn(async () => [])
    await resolveFoodItems([{ dbSearchName: ' 존재하지않는창작메뉴명xyz ' }], { searchRemote })

    expect(searchRemote).toHaveBeenCalledWith('존재하지않는창작메뉴명xyz', 'food')
  })
})

describe('recipeToPer100 — 단위 환산', () => {
  it('1인분 중량을 알면 그 값으로 100g당 환산하고 assumed=false', () => {
    const out = recipeToPer100({ name: '가지 탕수육', servingGram: 200, nutrientsPerServing: { calories: 300, protein: 10, fiber: null } })
    expect(out.assumed).toBe(false)
    expect(out.servingGram).toBe(200)
    expect(out.nutrients.calories).toBe(150) // 300kcal / 200g × 100
    expect(out.nutrients.fiber).toBeNull() // COOKRCP01엔 식이섬유가 없다 — null을 지어내지 않는다
  })

  it('중량을 모르면 표준 1인분을 가정하고 assumed=true로 알린다', () => {
    const out = recipeToPer100({ name: '김치찌개', servingGram: null, nutrientsPerServing: { calories: 300 } })
    expect(out.assumed).toBe(true)
    expect(out.servingGram).toBeGreaterThan(0)
  })
})
