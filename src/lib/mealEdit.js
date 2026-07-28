// 저장된 끼니의 항목 하나를 수동 보정한다(트랙 2 §5). MealsPage의 "수정" 흐름 전용 — 저장 전
// 결과 카드의 수동 보정(AnalysisResultCard.jsx, 트랙 2 §4)과는 별개다: 그쪽은 1인분 기준
// (baseNutrients)으로 되돌려 반영하지만, 여기는 이미 저장을 마친 최종값을 직접 고치는 자리라
// nextNutrients를 그대로 nutrients에 반영한다.
import { NUTRIENT_LABELS, NUTRITION_SOURCE } from './nutrition.js'

// item: 저장된 끼니 항목(nutrients/baseNutrients/servings 포함). nextNutrients: 사용자가 고친 최종값.
// baseNutrients(1인분 기준)가 원래 있던 항목이면 같은 배율로 함께 갱신한다 — 그래야 이 기록을
// 나중에 "다시 기록"했을 때도 인분 스테퍼가 올바른 1인분 값에서 출발한다. 원래 baseNutrients가
// 없던 구버전 기록은 새로 추측해 만들지 않고 그대로 없이 둔다.
export function applyManualNutrientEdit(item, nextNutrients) {
  const servings = typeof item.servings === 'number' && item.servings > 0 ? item.servings : 1
  const baseNutrients = item.baseNutrients
    ? Object.fromEntries(NUTRIENT_LABELS.map(({ key }) => [key, nextNutrients[key] / servings]))
    : item.baseNutrients

  return { ...item, nutrients: nextNutrients, baseNutrients, source: NUTRITION_SOURCE.MANUAL, matchType: null }
}
