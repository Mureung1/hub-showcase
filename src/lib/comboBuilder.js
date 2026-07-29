// FR-19 — 커스텀 조합 음식 빌더의 순수 합산 로직. 재료는 /api/food-items가 돌려준 DB 항목을 이름
// 매칭 없이 직접 선택하므로(정확도 근거), scaleNutrients(nutrition.js)/sumNutrients(mealStore.js)
// 기존 함수만으로 충분하다 — 새 계산 로직을 만들지 않는다.
import { sumNutrients } from './mealStore.js'
import { NUTRITION_SOURCE, scaleNutrients } from './nutrition.js'

export const DEFAULT_SERVING_GRAMS = 100

// selected: [{ name, nutrients(100g 기준), baseQuantity, servingGrams, qty }]
// qty(담은 횟수, 기본 1)만큼 servingGrams(1회 분량, 없으면 DEFAULT_SERVING_GRAMS)를 곱해 실제 섭취
// 그램으로 환산한다. isMealAnalysis(nutrition.js) 계약을 충족해 AnalysisResultCard가 그대로 재사용된다.
export function buildComboAnalysis(selected) {
  const items = (selected ?? []).map((sel) => {
    const grams = (sel.servingGrams ?? DEFAULT_SERVING_GRAMS) * (sel.qty ?? 1)
    return {
      name: sel.name,
      nutrients: scaleNutrients(sel.nutrients, sel.baseQuantity ?? 100, grams),
      source: NUTRITION_SOURCE.DB,
    }
  })
  return { items, total: sumNutrients(items) }
}
