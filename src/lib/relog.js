// 저장된 끼니 기록 -> Analyze.jsx의 prefillTrayAnalysis 입구로 넘길 상태(트랙 2 §3, 다시 기록).
// 순수 함수라 여기서만 검증하고, MealsPage.jsx는 이 결과를 navigate에 그대로 넘기기만 한다.
import { sumNutrients } from './mealStore.js'

// analysis는 항상 1인분(baseNutrients) 기준으로 넘긴다 — Analyze.jsx의 결과 카드가 그 전제로 인분
// 스테퍼를 계산하기 때문이다. baseNutrients가 없는 구버전 기록은 저장된 nutrients를 그대로 1인분으로
// 해석한다(다른 화면들과 동일한 폴백 규칙). servings도 원래 기록값을 그대로 복원해, "그때 그 양 그대로"
// 다시 기록하는 흐름을 만든다 — CafeteriaPanel의 한 판 통합 분석은 이 필드를 안 넘겨(항상 새 1인분
// 기준) 그쪽 동작은 그대로다.
export function buildRelogNavState(record) {
  const items = record.items.map((item) => ({
    name: item.name,
    brand: item.brand,
    nutrients: item.baseNutrients ?? item.nutrients,
    source: item.source,
  }))
  return {
    prefillTrayAnalysis: {
      pendingAnalysis: { items, total: sumNutrients(items) },
      mealType: record.mealType,
      servings: record.items[0]?.servings ?? 1,
    },
  }
}
