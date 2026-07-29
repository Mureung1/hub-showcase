// 식당 추천 2차원 스코어링(FR-4). 원래 요청은 "영양+거리+네이버 평점" 3차원이었지만, 네이버 지역
// 검색 API 응답 어디에도 평점/리뷰 수 필드가 없어(직접 확인) 그 항목은 뺐다 — 있지도 않은 데이터로
// 점수를 지어내지 않는다.
export const NUTRITION_WEIGHT = 0.7
export const DISTANCE_WEIGHT = 0.3

// deficientRows: buildDeficiencyRows(nutrition.js)의 반환값({key,label,unit,recommended,actual,deficiency,ratio}[]).
// expected: attachExpectedIntake가 채운 이 식당 대표메뉴의 예상 섭취량({key: number}).
// 각 부족 영양소를 이 메뉴가 얼마나 채우는지(0~1로 clamp)의 평균 — 하나도 못 채우면 0.
export function calcFulfillmentRatio(expected, deficientRows) {
  if (!expected || !deficientRows || deficientRows.length === 0) return 0
  const ratios = deficientRows
    .filter((row) => typeof expected[row.key] === 'number' && row.deficiency > 0)
    .map((row) => Math.min(1, expected[row.key] / row.deficiency))
  if (ratios.length === 0) return 0
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length
}

// distance/maxDistance: 이미 계산된 place.distance와 검색 반경(MAX_DISTANCE_METERS). 0~100 정수로 반환.
export function calcPlaceScore({ expected, deficientRows, distance, maxDistance }) {
  const nutritionScore = calcFulfillmentRatio(expected, deficientRows)
  const proximityScore = maxDistance > 0 ? Math.max(0, Math.min(1, 1 - distance / maxDistance)) : 0
  const score = NUTRITION_WEIGHT * nutritionScore + DISTANCE_WEIGHT * proximityScore
  return Math.round(score * 100)
}
