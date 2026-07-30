// pickBestFoodMatch / foodNameSimilarity 매칭 규칙 고정 테스트.
// 핵심 보장: ① 정확 일치(공백 무시) 우선 ② 접두 수식어 변형("돌솥비빔밥")은 통과
// ③ 접미 파생("라면땅")은 탈락해 다음 폴백으로 넘어간다 ④ 음식DB 다건 정확 일치는 평균.
import { describe, it, expect } from 'vitest'
import { FOOD_MATCH_SIMILARITY_THRESHOLD, foodNameSimilarity, pickBestFoodMatch } from './fooddb.js'

function record(name, nutrients = {}) {
  return {
    name,
    baseQuantity: { value: 100, unit: 'g', raw: '100g' },
    servSize: null,
    foodSize: null,
    brand: null,
    nutrients: { calories: 100, protein: 5, fat: 3, carbs: 15, fiber: 1, sodium: 300, ...nutrients },
  }
}

describe('foodNameSimilarity', () => {
  it('동일 이름(공백 무시)은 1', () => {
    expect(foodNameSimilarity('비빔밥', '비빔밥')).toBe(1)
    expect(foodNameSimilarity('돌솥비빔밥', '돌솥 비빔밥')).toBe(1)
  })

  it('접두 수식어 변형(핵심 음식명이 뒤)은 기준값 이상 — 같은 음식', () => {
    for (const [a, b] of [
      ['비빔밥', '돌솥비빔밥'],
      ['비빔밥', '산채비빔밥'],
      ['김치찌개', '참치김치찌개'],
      ['라면', '신라면'],
      ['짜장면', '삼선짜장면'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeGreaterThanOrEqual(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  it('접미 파생(다른 음식으로 이어지는 이름)은 기준값 미만 — 다른 음식', () => {
    for (const [a, b] of [
      ['라면', '라면땅'],
      ['김밥', '김밥천국도시락'],
      ['떡볶이', '떡볶이맛과자'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeLessThan(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  it('무관한 이름은 0', () => {
    expect(foodNameSimilarity('라면', '샐러드')).toBe(0)
    expect(foodNameSimilarity('', '라면')).toBe(0)
  })

  // 식약처 DB는 변형을 "기본명_수식어"로 등록한다(김치찌개_돼지고기, 갈비구이_소고기_양념…).
  // 접두 수식어 변형과 방향만 반대일 뿐 같은 음식인데, 예전엔 startsWith라는 이유로 0.14~0.2를
  // 받아 전부 탈락했다 — DB 레코드 대부분에 도달할 수 없었다.
  it('DB 변형명(기본명_수식어)은 기준값 이상 — 같은 음식', () => {
    for (const [a, b] of [
      ['김치찌개', '김치찌개_돼지고기'],
      ['갈비구이', '갈비구이_소고기_양념'],
      ['제육볶음', '제육볶음_채소'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeGreaterThanOrEqual(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  // 재료는 같고 조리법만 붙은 경우. 엄밀히는 다른 음식이지만, 떨어뜨리면 AI 추정치로 폴백해
  // 훨씬 큰 오차가 난다(실측: "돼지갈비"가 resolveFood 경로에서 통째로 매칭 실패 → 70kcal).
  it('조리법 접미사만 붙은 이름은 기준값 이상', () => {
    for (const [a, b] of [
      ['돼지갈비', '돼지갈비찜'],
      ['돼지갈비', '돼지갈비구이'],
      ['고등어', '고등어조림'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeGreaterThanOrEqual(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  // 한국어 급식·식당 메뉴는 재료가 이름 **가운데**에 끼어드는 형태가 지배적인데(꽁치김치조림 ↔
  // 꽁치조림), 이건 endsWith도 startsWith도 includes도 아니라 예전엔 전부 0점이었다. 실측으로
  // NEIS 급식 288항목 중 DB가 찾은 198건의 29%(57건)가 이렇게 버려지고 있었다.
  it('가운데에 재료가 끼어든 이름은 기준값 이상 — 같은 음식', () => {
    for (const [a, b] of [
      ['꽁치김치조림', '꽁치조림'],
      ['참치야채죽', '참치죽'],
      ['감자채볶음', '감자볶음'],
      ['들깨무채국', '들깨국'],
      ['두부강정샐러드', '두부채소샐러드'],
      ['팬케이크', '핫케이크'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeGreaterThanOrEqual(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  // 식약처 변형명은 마디 순서가 우리말 어순과 반대인 경우가 많다(`샌드위치_바삭몬테크리스토` ↔
  // `몬테크리스토샌드위치`). 앞뒤 관계도 앞머리·꼬리 공유도도 **순서**를 전제해서 이런 쌍을 전부
  // 0점으로 떨어뜨렸다 — 급식표의 현대·퓨전 메뉴가 DB에 있는데도 못 찾던 원인 중 하나다.
  it('`_` 변형명은 마디 순서가 뒤바뀌어도 같은 음식으로 본다', () => {
    for (const [a, b] of [
      ['몬테크리스토샌드위치', '샌드위치_바삭몬테크리스토'],
      ['돼지고기김치찌개', '김치찌개_돼지고기'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeGreaterThanOrEqual(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  // 순수 오탈자 — 자모 해상도로 봐야 잡힌다. 음절 단위로는 `닭`과 `닥`이 완전히 다른 글자라
  // 3글자 중 1개(33%)를 잃지만, 자모로 풀면 8개 중 1개(12%) 차이다.
  it('한 글자 오탈자는 자모 유사도로 구제한다', () => {
    for (const [a, b] of [
      ['닭갈비', '닥갈비'],
      ['돼지김치찌개', '돼지깁치찌개'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeGreaterThanOrEqual(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  // 위 완화의 안전장치: 한국어 음식명은 **꼬리가 음식의 종류**다. 앞머리를 아무리 공유해도 꼬리가
  // 다르면 다른 음식이다. 이게 없으면 "계란국"이 "계란빵"에 0.75로 붙어, 급식 국 한 그릇이
  // 158kcal/100g짜리 빵으로 계산된다(실측: 계란국 300g이 474kcal로 나왔다).
  it('음식 종류(꼬리)가 다르면 앞머리가 같아도 차단한다', () => {
    for (const [a, b] of [
      ['계란국', '계란빵'],
      ['콩나물국', '잔치국수'],
      ['볶음밥', '오징어볶음'],
      ['물만두계란국', '물만두'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeLessThan(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  // 위 두 완화가 startsWith 전체를 열어버리지 않았는지 — 이게 무너지면 편집거리 단계가 물어오는
  // 엉뚱한 음식이 그대로 채택된다.
  it('완화 후에도 다른 음식은 여전히 탈락한다', () => {
    for (const [a, b] of [
      ['라면', '라면땅'],
      ['김밥', '김밥천국'],
      ['된장', '된장찌개'], // 장(조미료)과 찌개는 다른 음식 — 조리법 접미사 목록에 '찌개'는 없다
      ['치킨', '제육(돼지고기 수육)'],
      ['파스타', '토스트(식빵)'],
      ['콩자반', '간자장'], // 편집거리로만 가까운 무관한 음식 — 급식 트레이에서 실제로 잡히던 오매칭
      ['우유', '우동'],
      ['양념갈비', '양념두부'],
      // 아래 넷은 자모 역색인이 상위 후보로 물어오는 것들이다 — retrieval이 넓어진 만큼
      // 게이트가 이걸 계속 막는지가 더 중요해졌다.
      ['치킨', '치킨가스'],
      ['파스타', '팟타이'],
      ['양념갈비', '갈비구이_소고기_양념'], // 소고기로 특정된 레코드 — 양념갈비 일반과는 다르다
      ['콩자반', '콩나물밥'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeLessThan(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })
})

describe('pickBestFoodMatch', () => {
  it('빈 결과는 null', () => {
    expect(pickBestFoodMatch([], '라면')).toBeNull()
    expect(pickBestFoodMatch(null, '라면')).toBeNull()
  })

  it('정확 일치가 있으면 그것을 쓴다', () => {
    const exact = record('라면')
    expect(pickBestFoodMatch([record('라면땅'), exact], '라면')).toBe(exact)
  })

  it('공백만 다른 등록 표기("돌솥 비빔밥")도 정확 일치로 취급한다', () => {
    const spaced = record('돌솥 비빔밥')
    expect(pickBestFoodMatch([spaced], '돌솥비빔밥')).toBe(spaced)
  })

  it('음식DB(averageExactMatches): 정확 일치 다건이면 100g 기준 평균 — 기존 동작 유지', () => {
    const results = [record('비빔밥', { protein: 4 }), record('비빔밥', { protein: 6 })]
    const picked = pickBestFoodMatch(results, '비빔밥', { averageExactMatches: true })
    expect(picked.nutrients.protein).toBe(5)
    expect(picked.baseQuantity.value).toBe(100)
  })

  it('가공식품DB(기본): 정확 일치 다건이어도 평균 내지 않고 첫 항목 — 기존 동작 유지', () => {
    const first = record('신라면', { protein: 4 })
    const picked = pickBestFoodMatch([first, record('신라면', { protein: 6 })], '신라면')
    expect(picked).toBe(first)
  })

  it('정확 일치가 없어도 접두 수식어 변형이면 채택한다', () => {
    const variant = record('돌솥비빔밥')
    expect(pickBestFoodMatch([variant], '비빔밥')).toBe(variant)
  })

  it('정확 일치가 없고 접미 파생("라면땅")뿐이면 null — 다음 폴백 단계로 넘긴다', () => {
    expect(pickBestFoodMatch([record('라면땅')], '라면')).toBeNull()
    expect(pickBestFoodMatch([record('김밥천국도시락')], '김밥')).toBeNull()
  })

  it('후보가 여럿이면 유사도가 가장 높은 것을 고른다', () => {
    const closer = record('산채비빔밥')
    const farther = record('전주식산채비빔밥')
    expect(pickBestFoodMatch([farther, closer], '비빔밥')).toBe(closer)
  })
})
