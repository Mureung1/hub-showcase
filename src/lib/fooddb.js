// /api/fooddb 프록시 경유 식약처 전국통합식품영양성분정보 검색 헬퍼.
// source: 'food'(조리식·기본) | 'process'(가공식품, 편의점/포장/프랜차이즈 제품 보완용 폴백)
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function searchFoodDB(foodName, source = 'food') {
  if (!foodName || typeof foodName !== 'string' || !foodName.trim()) {
    throw new Error('foodName is required')
  }

  const res = await fetchWithTimeout('/api/fooddb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foodName: foodName.trim(), source }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(data?.error || `FoodDB request failed (${res.status})`)
    // 서버가 "식약처 연결 자체가 안 됨"을 code로 표시해주면 그대로 옮겨 담는다.
    // findFoodMatch가 이 code를 보고 나머지 재시도를 건너뛸지 판단한다.
    if (data?.code) err.code = data.code
    throw err
  }

  return Array.isArray(data) ? data : []
}

const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']

// baseQuantity(보통 100g/100ml)가 100이 아닌 항목이 섞여 있어도 공정하게 평균 내기 위해 "100 기준"으로 환산한다.
function nutrientsPerHundred(match) {
  const base = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
  const factor = 100 / base
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const value = match.nutrients?.[key]
      return [key, typeof value === 'number' ? value * factor : null]
    }),
  )
}

function averageNutrientSets(nutrientSets) {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const values = nutrientSets.map((n) => n[key]).filter((v) => typeof v === 'number')
      return [key, values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null]
    }),
  )
}

// 같은 이름으로 여러 항목이 매칭되면(학교급식/외식 등 레시피별 변형) 임의로 첫 항목만 쓰지 않고 평균해서
// 더 대표성 있는 표준값을 만든다. 항목 하나를 그대로 고르는 것보다 레시피 변형 간 편차(예: 저지방 급식
// 레시피 vs 고지방 외식 레시피)로 인한 오차를 줄여준다.
function averageFoodMatches(exactMatches) {
  return {
    name: exactMatches[0].name,
    baseQuantity: { value: 100, unit: exactMatches[0].baseQuantity?.unit ?? 'g', raw: null },
    servSize: null,
    foodSize: null,
    brand: null,
    nutrients: averageNutrientSets(exactMatches.map(nutrientsPerHundred)),
  }
}

// searchFoodDB 결과 중 가장 적합한 항목 선택: 검색어와 이름이 정확히 일치하는 항목들을 우선한다.
// averageExactMatches가 true면(음식/조리식 DB) 이름이 일치하는 항목이 여럿일 때 평균값을 쓰고,
// false면(가공식품 DB — 이름이 같아도 서로 다른 브랜드 제품일 수 있어 평균하면 실존하지 않는 값이 나올
// 수 있다) 첫 번째 일치 항목을 그대로 쓴다. 정확히 일치하는 항목이 없으면 검색 결과 중 첫 번째를 쓴다.
export function pickBestFoodMatch(results, searchName, { averageExactMatches = false } = {}) {
  if (!Array.isArray(results) || results.length === 0) return null
  const exact = results.filter((r) => r.name === searchName)
  if (exact.length === 0) return results[0]
  if (exact.length === 1 || !averageExactMatches) return exact[0]
  return averageFoodMatches(exact)
}
