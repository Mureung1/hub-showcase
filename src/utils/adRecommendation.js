// 광고에 띄울 영양제를 고르는 순수 함수(PRD v2.0 §3.2). 화면(DeficientNutrientAds.jsx)은 이 함수의
// 결과를 그리기만 하고 판단은 전부 여기서 한다 — 그래야 로직만 따로 검증할 수 있다
// (scripts/check-ad-recommendation.mjs가 노드에서 이 파일을 그대로 불러 시나리오를 돌린다).
//
// 2단계 우선순위:
//   1순위 — 실측 부족 영양소: 오늘 식단 기록 기준 (섭취/권장) 달성률이 낮은 순으로 상위 1~3개.
//   2순위 — 폴백: 기록이 없거나 판단 불가할 때, 한국인 평균 섭취 실태 기준 대표 부족 영양소
//           (비타민D·칼슘·비타민A·마그네슘·오메가-3·비타민C)를 순환 방식으로 2~3개.
//
// **어떤 경우에도 빈 배열을 반환하지 않는다** — 폴백이 항상 보장되므로 배너가 비는 상태가 없다.
import {
  COUPANG_PRODUCTS,
  FALLBACK_NUTRIENT_ORDER,
  productsForNutrient,
} from '../data/coupangProducts.js'
import { NUTRIENT_SATISFY_RATIO } from '../lib/nutrition.js'

export const MAX_AD_PRODUCTS = 3
const MIN_FALLBACK_PRODUCTS = 2

// 나트륨은 "넘기면 안 되는 한도"라 부족 개념이 없어 광고 대상에서 제외한다(coupangProducts.js의
// AD_NUTRIENTS에도 sodium이 없다).
const EXCLUDED_KEYS = new Set(['sodium'])

// 실측 부족으로 판정할 달성률 상한. 앱의 다른 화면이 "부족"을 판정하는 기준(0.8)과 같은 값을 쓴다 —
// 식단 탭에서 초록색(달성)으로 보이는 영양소를 광고만 "부족"이라고 말하면 앱의 말이 앞뒤가 안 맞는다.
const DEFICIENT_RATIO = NUTRIENT_SATISFY_RATIO

// 날짜 문자열('YYYY-MM-DD')을 폴백 순환의 시작 위치로 바꾼다. 랜덤 대신 날짜 기반 순환을 쓰는 이유:
// 같은 날 화면을 오갈 때마다 배너 내용이 바뀌면 광고가 아니라 오작동처럼 보이고, 렌더마다 값이 달라져
// 디버깅도 어렵다. 날짜가 바뀌면 자연히 다른 영양소가 앞으로 온다.
function rotationOffset(dateKey) {
  const digits = String(dateKey ?? '').replace(/\D/g, '')
  if (!digits) return 0
  let sum = 0
  for (const ch of digits) sum += Number(ch)
  return sum
}

// 1순위 판정에 쓸 "부족 영양소 키 목록"(달성률 낮은 순). 광고 대상 상품이 있는 영양소만 남긴다.
export function findDeficientNutrients(recommended, total) {
  if (!recommended || !total) return []

  return Object.keys(recommended)
    .filter((key) => !EXCLUDED_KEYS.has(key))
    .filter((key) => productsForNutrient(key).length > 0)
    .map((key) => {
      const rec = Number(recommended[key]) || 0
      const actual = Number(total[key]) || 0
      return { key, ratio: rec > 0 ? actual / rec : null }
    })
    .filter(({ ratio }) => ratio !== null && ratio < DEFICIENT_RATIO)
    .sort((a, b) => a.ratio - b.ratio)
    .map(({ key, ratio }) => ({ key, ratio }))
}

// 폴백 목록에서 dateKey 기준으로 순환해 count개의 영양소를 고른다.
function pickFallbackNutrients(dateKey, count) {
  const offset = rotationOffset(dateKey) % FALLBACK_NUTRIENT_ORDER.length
  const rotated = [...FALLBACK_NUTRIENT_ORDER.slice(offset), ...FALLBACK_NUTRIENT_ORDER.slice(0, offset)]
  return rotated.filter((key) => productsForNutrient(key).length > 0).slice(0, count)
}

// 영양소 키 목록 -> 상품 목록. 한 영양소에 상품이 여러 개면 첫 번째만 쓴다(같은 영양소 상품이 배너를
// 다 차지해 다른 부족 영양소가 밀려나지 않게).
function toProducts(nutrientKeys) {
  return nutrientKeys
    .map((key) => productsForNutrient(key)[0])
    .filter(Boolean)
    .slice(0, MAX_AD_PRODUCTS)
}

// recommended: 하루 권장 영양정보(없으면 판단 불가 -> 폴백)
// total      : 오늘 섭취 합계
// mealCount  : 오늘 기록된 끼니 수(0이면 기록 없음 -> 폴백)
// dateKey    : 'YYYY-MM-DD' — 폴백 순환 기준
// 반환: { source: 'deficiency' | 'fallback', products: Product[] } — products는 절대 비지 않는다.
export function recommendAdProducts({ recommended, total, mealCount = 0, dateKey } = {}) {
  const canJudge = Boolean(recommended) && Boolean(total) && mealCount > 0

  if (canJudge) {
    const deficient = findDeficientNutrients(recommended, total)
    const products = toProducts(deficient.map((d) => d.key))
    if (products.length > 0) return { source: 'deficiency', products }
    // 기록은 있는데 부족한 영양소가 하나도 없는 경우(전부 달성)도 폴백으로 내려간다 — 배너를 비우는 것보다
    // 흔히 부족한 미량영양소를 보여주는 편이 PRD의 "배너는 항상 표시" 요구에 맞는다.
  }

  const fallback = pickFallbackNutrients(dateKey, MAX_AD_PRODUCTS)
  const products = toProducts(fallback)

  // 데이터 파일에 폴백 상품이 모자란 비정상 상황에서도 빈 배열은 내보내지 않는다.
  if (products.length < MIN_FALLBACK_PRODUCTS) {
    const filler = COUPANG_PRODUCTS.filter((p) => !products.some((x) => x.id === p.id))
    return { source: 'fallback', products: [...products, ...filler].slice(0, MAX_AD_PRODUCTS) }
  }

  return { source: 'fallback', products }
}
