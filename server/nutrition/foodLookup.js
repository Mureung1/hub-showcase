// 6주차 §0 — server/data/foodDB.json(scripts/buildFoodDB.js가 생성) 기반 로컬 식품 매칭.
// 기존 /api/fooddb(findFoodMatch, 사진 분석용)는 요청마다 식약처 API를 실시간 호출하지만, 이 모듈은
// 서버 기동 시 1회 메모리에 올려두고 그 안에서만 찾는다 — precisionEngine(6주차 §1)이 요청마다
// 외부 API를 기다리지 않고 즉시 매칭하기 위한 것으로, 기존 findFoodMatch 경로와는 별개다.
//
// 매칭 순서(PRD): 정규화 → 완전일치 → 별칭 → 부분포함(긴 이름 우선) → 편집거리 ≤2.
// 이 전략 자체는 레시피DB(recipeLookup.js)와 공유하므로 nameMatcher.js로 뽑았다 — 이 파일은 이제
// "foodDB.json을 읽어 그 매처에 물리고, 응답 모양으로 변환"하는 역할만 한다(매칭 동작은 불변).
//
// ⚠️ 편집거리 단계는 오탈자 구제가 목적이라 의미가 다른 음식을 물어올 수 있다(실측: "치킨" →
// "제육(돼지고기 수육)", "파스타" → "토스트(식빵)"). 그래서 matchType을 반드시 함께 반환하며,
// 호출부는 'fuzzy'를 무검증으로 채택하면 안 된다 — resolveFood.js가 유사도 재검증으로 거른다.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCanonicalName } from '../../src/lib/foodData.js'
import { createNameIndex } from './nameIndex.js'
import { createNameMatcher } from './nameMatcher.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FOOD_DB_PATH = path.join(__dirname, '..', 'data', 'foodDB.json')

let matcher = null // createNameMatcher(...)의 반환 함수 — 지연 로드
let index = null // createNameIndex(...)의 반환 함수

function load() {
  if (matcher) return
  const raw = JSON.parse(readFileSync(FOOD_DB_PATH, 'utf8'))
  const options = { getName: (item) => item.name, getAliases: (item) => item.aliases }
  matcher = createNameMatcher(raw.items, { ...options, getCanonicalName })
  index = createNameIndex(raw.items, options)
}

// 서버 재기동 없이 foodDB.json을 다시 만들었을 때 테스트/스크립트에서 강제로 다시 읽고 싶을 때만 사용.
export function _resetForTest() {
  matcher = null
  index = null
}

// retrieval 전용 — 정확도 판정 없이 "이름이 닮은 것들"을 넓게 회수한다(자모 bi-gram 역색인).
// lookupFood가 답을 **하나만** 주고 그게 틀리면 끝이던 구조를 보완한다: 여러 후보를 받아 호출부의
// 유사도 게이트가 최선을 고르게 하면, 게이트를 엄격하게 만들어도 매칭률이 떨어지지 않는다.
export function searchFoodCandidates(menuName, limit) {
  load()
  return index(menuName, limit)
}

// 출처 선호 순서 — 같은 음식이라도 식당에서 파는 것과 급식으로 나오는 것은 영양밀도가 다르다.
// 실측: '돼지갈비구이'가 중고등학교급식 레코드로는 132kcal/100g인데, 외식 분석함량 레코드
// ('갈비구이_돼지고기')는 294, 프랜차이즈 공식('돼지갈비구이_폭립')은 295다 — 2.2배 차이.
// '김치찌개'는 급식 19kcal/100g으로, 식당 김치찌개(50~60)와는 다른 음식에 가깝다.
//
// 빌드 스크립트(scripts/buildFoodDB.js)는 예전엔 이름당 한 건만 남기고 나머지 출처를 통째로
// 버렸는데(급식 우선), 그래서 한국인이 가장 많이 먹는 메뉴가 전부 급식 수치로 고정돼 있었다.
// 이제 variants[]로 출처별 레코드를 모두 보존하고, 어느 쪽을 쓸지 여기서 고른다.
// 순서의 원칙은 두 가지다: ① **실측(분석함량)이 계산값(재료량 기반 산출)보다 앞선다**
// ② 같은 등급이면 도메인이 맞는 쪽(식당엔 외식, 급식엔 급식)이 앞선다.
// ①이 중요한 이유: '재료량 기반 산출'은 레시피의 재료 무게를 더한 값이라 조리 중 흡수되는 기름·
// 양념이 빠지고, 뼈·껍질까지 중량에 포함돼 밀도가 낮게 나온다. 실측으로 확인된 격차 —
// 굴비구이 외식산출 122 vs 급식실측 524, 오징어채무침 외식산출 118 vs 가정식분석 258.
// 그래서 외식이라도 '산출'(4)은 가정식 '분석'(1)보다 뒤에 둔다.
const ORIGIN_PREFERENCE = {
  // 프랜차이즈 공식 → 외식 분석 → 가정식 분석 → 외식 산출 → (없으면) 급식 산출
  restaurant: ['2', '3', '1', '4', '6', '5', '7'],
  // 포장식품·프랜차이즈 제품으로 식별된 경우. 업체가 제출한 공식 수치(2)가 압도적으로 정확하고,
  // 그다음은 실측 분석(1: 가정식분석은 실제 조리품을 분석한 값이라 3보다 조리 상태에 가깝다).
  // restaurant와 2·3만 순서가 다른데, 그 차이가 곧 "이 제품의 공식 표기 vs 비슷한 외식 메뉴 평균"
  // 이라 포장 제품에서는 전자가 맞다.
  packaged: ['2', '1', '3', '4', '6', '5', '7'],
  // 집밥. 외식보다 기름·양념이 적고 급식보다는 많다 — 가정식 분석(1)이 정확히 그 값이다.
  home: ['1', '3', '4', '2', '6', '5', '7'],
  // 급식은 도메인 일치가 최우선 — 학식·급식 화면의 기존 동작을 그대로 유지한다.
  cafeteria: ['6', '5', '7', '3', '1', '4', '2'],
}

// variants가 없는 레코드(재빌드 전 스냅샷)는 대표값을 그대로 쓴다 — 하위 호환.
// export하는 이유: precisionEngine은 toFoodItemResponse를 거치지 않고 item을 직접 읽으므로,
// 같은 선택 규칙을 쓰려면 이 함수가 필요하다(규칙이 두 벌이 되면 또 갈라진다).
export function pickVariantForContext(item, context) {
  const variants = item.variants
  if (!Array.isArray(variants) || variants.length === 0) return item
  const preference = ORIGIN_PREFERENCE[context] ?? ORIGIN_PREFERENCE.restaurant
  for (const code of preference) {
    const hit = variants.find((v) => v.originCode === code)
    if (hit) return { ...item, ...hit }
  }
  return { ...item, ...variants[0] }
}

// FR-8 — /api/fooddb의 기존 응답 모양(normalizeFoodItem 참고 — name/baseQuantity/servSize/foodSize/
// brand/nutrients)에 맞춰 이 모듈의 item(nutrientsPer100 등)을 변환한다. findFoodMatch(Analyze.jsx)의
// 나머지 7단계가 전부 이 모양을 기대하므로, 로컬 폴백만 다른 모양을 쓰면 호출부를 또 분기해야 한다.
//
// 출처 변형 선택이 여기 한 곳에서만 일어나는 게 중요하다 — 영양수치(nutrients)와 제공량(servSize)이
// 둘 다 이 함수를 통과하므로, 둘이 서로 다른 출처에서 섞여 나오는 일이 생기지 않는다.
export function toFoodItemResponse(item, context = 'restaurant') {
  const picked = pickVariantForContext(item, context)
  return {
    name: item.name,
    baseQuantity: { value: 100, unit: 'g', raw: null }, // nutrientsPer100 기준
    // ⚠️ servSize는 "포장 단위처럼 진짜 근거가 있는 1회 제공량"만 담는 자리다(가공식품 DB·레시피DB가
    // 아는 경우). 로컬 음식DB의 servingGram은 그냥 일반적인 1인분 추정치라 여기 넣으면 안 된다 —
    // nutrition.js의 resolveConsumedGrams가 servSize를 보면 **사진에서 추정한 실제 섭취량을
    // 덮어써서** 곱빼기·소식을 전부 표준 1인분으로 뭉갠다. 대신 아래 referenceServingGram으로 넘겨
    // "메뉴명만 아는 경로"(식당 대표 메뉴 등)에서만 쓰이게 한다.
    servSize: null,
    referenceServingGram: picked.servingGram ?? null,
    foodSize: null,
    brand: null,
    nutrients: picked.nutrientsPer100,
  }
}

// 반환: { item, matchType: 'exact'|'alias'|'partial'|'fuzzy' } | null
export function lookupFood(menuName) {
  load()
  return matcher(menuName)
}
