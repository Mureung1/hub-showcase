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
  it('편집거리로만 걸린 무관한 음식은 절대 채택하지 않는다', async () => {
    const out = await resolveFoodItems([{ dbSearchName: '치킨' }, { dbSearchName: '파스타' }])
    // 무엇에 매칭되든 **이 둘만은** 나오면 안 된다. retrieval을 넓힌 뒤로는 "아무것도 못 찾는다"보다
    // "엉뚱한 걸 찾지 않는다"가 지켜야 할 불변식이다(파스타는 이제 진짜 파스타 레코드를 찾는다).
    expect(out[0].matchedName ?? '').not.toMatch(/제육/)
    expect(out[1].matchedName ?? '').not.toMatch(/토스트/)
  })

  // 이름은 닮았지만 영양이 검증 범위 밖인 후보 — retrieval을 넓히면서 새로 생긴 위험이다.
  // 실측: `치킨`이 레시피DB `삼계치킨`(120kcal/100g)에 0.85로 붙는데, 검증된 치킨은 180~326이다.
  // 이름만으로는 "치킨의 한 종류"가 맞지만 대표값으로는 틀렸고, 그럴 땐 AI 추정이 낫다.
  it('이름은 닮았어도 검증된 현실 범위를 벗어나는 후보는 랭킹에서 뺀다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '치킨' }])
    expect(out.match).toBeNull()
    expect(out.source).toBe(RESOLVE_SOURCE.ESTIMATED)
  })

  // 반대 방향 — 검증 범위 안에 드는 후보는 정상 채택돼야 한다(veto가 과하지 않은지).
  it('검증 범위 안의 후보는 그대로 채택한다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '파스타' }])
    expect(out.match).not.toBeNull()
    expect(out.match.nutrients.calories).toBeGreaterThan(100) // 냉파스타(64) 같은 니치 레시피가 아니다
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
  // 리뷰에서 발견 — nameCandidates 개수에 상한이 없으면 항목 하나가 검색어 N개 × 2소스만큼 원격에
  // 동시 요청을 낸다. 프롬프트는 "2~3개"를 기대하지만 스키마가 강제하지 않으므로, 여기서 자르지
  // 않으면 조작되거나 예상보다 큰 응답 하나가 식약처 API 쿼터를 과도하게 소모할 수 있었다.
  it('nameCandidates가 비정상적으로 많아도 항목당 원격 호출 수는 상한을 넘지 않는다', async () => {
    const searchRemote = vi.fn(async () => [])
    const manyCandidates = Array.from({ length: 30 }, (_, i) => `존재하지않는메뉴${i}`)
    await resolveFoodItems([{ dbSearchName: manyCandidates[0], nameCandidates: manyCandidates }], { searchRemote })

    // 검색어 수 × 2소스(food/process)가 곧 호출 수다 — 30개면 60회가 나야 하지만 상한에 걸려야 한다.
    expect(searchRemote.mock.calls.length).toBeLessThan(30)
  })

  // 2차 리뷰에서 발견한 회귀: 위 상한을 "합친 뒤" 걸면 배열 맨 뒤의 fallbackSearchName이 가장 먼저
  // 잘려나간다. fallbackSearchName은 "항상 dbSearchName보다 더 일반적인 상위 카테고리명"인 마지막
  // 안전망이라, 후보가 많을수록 안전망이 사라지는 정반대 결과가 됐다.
  it('후보가 상한을 넘겨도 fallbackSearchName은 살아남는다(안전망이 먼저 잘리면 안 된다)', async () => {
    const junk = Array.from({ length: 8 }, (_, i) => `존재하지않는창작메뉴${i}`)
    const [out] = await resolveFoodItems([
      { dbSearchName: junk[0], fallbackSearchName: '돈가스', nameCandidates: junk },
    ])

    expect(out.matchedName).toBe('돈가스')
    expect(out.source).toBe(RESOLVE_SOURCE.DB)
  })

  it('검색어 앞뒤 공백을 trim해서 원격에 넘긴다', async () => {
    const searchRemote = vi.fn(async () => [])
    await resolveFoodItems([{ dbSearchName: ' 존재하지않는창작메뉴명xyz ' }], { searchRemote })

    expect(searchRemote).toHaveBeenCalledWith('존재하지않는창작메뉴명xyz', 'food')
  })
})

// 같은 음식이라도 어디서 나왔느냐로 참조할 식약처 출처가 갈린다(실측: 김치찌개가 급식
// 19kcal/100g, 외식 61 — 3.2배). 예전엔 이 판단을 화면이 하드코딩해서, 한 사진 안에 급식 식판과
// 포장 음료가 같이 있어도 전부 같은 맥락으로 계산됐다.
describe('항목별 맥락(servingContext)', () => {
  it('항목이 지정한 맥락이 요청 단위 기본값을 이긴다', async () => {
    const [cafeteria, restaurant] = await resolveFoodItems(
      [
        { dbSearchName: '김치찌개', servingContext: 'cafeteria' },
        { dbSearchName: '김치찌개' },
      ],
      { context: 'restaurant' },
    )

    expect(cafeteria.context).toBe('cafeteria')
    expect(restaurant.context).toBe('restaurant')
    // 같은 이름인데 출처가 달라 영양밀도가 갈린다 — 이게 갈리지 않으면 맥락 분기가 죽은 것이다.
    expect(cafeteria.match.nutrients.calories).toBe(19)
    expect(restaurant.match.nutrients.calories).toBe(61)
  })

  it('알 수 없는 맥락 문자열은 요청 기본값으로 떨어진다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '비빔밥', servingContext: '엉뚱한값' }], { context: 'cafeteria' })
    expect(out.context).toBe('cafeteria')
  })
})

// 예전엔 음식DB와 가공식품DB 중 **먼저 도착한 응답**이 이겼다 — 둘 다 같은 이름을 갖고 있으면
// 그날의 네트워크 사정에 따라 같은 입력에 다른 답이 나왔다.
describe('원격 소스 선택은 도착 순서가 아니라 맥락이 정한다', () => {
  const bothSources = (foodDelay, processDelay) =>
    vi.fn(
      (term, source) =>
        new Promise((resolve) =>
          setTimeout(() => resolve([remoteRecord(term, { calories: source === 'food' ? 111 : 222 })]), source === 'food' ? foodDelay : processDelay),
        ),
    )

  it('식당 맥락은 가공식품DB가 먼저 도착해도 음식DB를 고른다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '존재하지않는창작메뉴명xyz' }], {
      searchRemote: bothSources(60, 0),
      deadlineMs: 1000,
    })
    expect(out.match.nutrients.calories).toBe(111)
  })

  it('포장 맥락은 음식DB가 먼저 도착해도 가공식품DB(공식 표기)를 고른다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '존재하지않는창작메뉴명xyz', servingContext: 'packaged' }], {
      searchRemote: bothSources(0, 60),
      deadlineMs: 1000,
    })
    expect(out.match.nutrients.calories).toBe(222)
  })
})

// 이름 꼬리 기반 차단(foodMatch.js)은 양쪽 다 알아볼 수 있는 꼬리를 가졌을 때만 동작한다.
// 창작·외래 메뉴명엔 안 걸리는데, AI가 준 상차림 역할이 그 구멍을 메운다.
describe('역할 충돌 veto', () => {
  it('역할이 범주적으로 다른 원격 후보는 유사도와 무관하게 버린다', async () => {
    const searchRemote = vi.fn(async (term) => (term === '수정과' ? [remoteRecord('수정과')] : []))
    // '수정과'는 drink로 분류된다 — soup로 식별된 음식에 붙으면 안 된다.
    const [out] = await resolveFoodItems([{ dbSearchName: '수정과', role: 'soup' }], { searchRemote, deadlineMs: 1000 })
    expect(out.match).toBeNull()
  })

  it('역할 힌트가 맞으면 그대로 채택한다', async () => {
    const searchRemote = vi.fn(async (term) => (term === '수정과' ? [remoteRecord('수정과')] : []))
    const [out] = await resolveFoodItems([{ dbSearchName: '수정과', role: 'drink' }], { searchRemote, deadlineMs: 1000 })
    expect(out.match).not.toBeNull()
  })

  it('인접한 역할(주찬↔부찬)은 막지 않는다 — 같은 반찬이 양에 따라 갈리는 정도의 차이다', async () => {
    const searchRemote = vi.fn(async (term) => (term === '제육볶음' ? [remoteRecord('제육볶음')] : []))
    const [out] = await resolveFoodItems([{ dbSearchName: '제육볶음', role: 'main' }], { searchRemote, deadlineMs: 1000 })
    expect(out.match).not.toBeNull()
  })
})

// 사진 경로의 배식비율 계산(표준 1인분 × portionRatio)이 이 두 필드로 열리고 닫힌다.
describe('표준 1인분과 그 근거', () => {
  it('DB 매칭에 실패해도 정량 사전·역할로 표준 1인분을 돌려준다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '치킨' }]) // 매칭은 실패하지만 사전엔 있다
    expect(out.match).toBeNull()
    expect(out.servingGram).toBeGreaterThan(0)
    expect(out.servingGramFounded).toBe(true)
  })

  it('아무 근거도 없으면 중립값을 주되 founded=false로 알린다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '정체불명음식' }])
    expect(out.servingGram).toBeGreaterThan(0)
    expect(out.servingGramFounded).toBe(false)
  })

  it('AI 역할 힌트가 있으면 근거 있는 표준 1인분이 된다', async () => {
    const [out] = await resolveFoodItems([{ dbSearchName: '정체불명음식', role: 'soup' }])
    expect(out.servingGramFounded).toBe(true)
    expect(out.servingGram).toBe(300) // mealPortions의 soup 표준
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
