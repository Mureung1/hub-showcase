// 급식 기반 하루 설계(트랙 3 §3) — "한 판 통합 분석"으로 방금 확인한 급식 한 끼가 하루 권장량 중
// 어디를 못 채웠는지 짚어주고, 다음 끼니로 안내한다. buildDeficiencyRows(nutrition.js)를 그대로
// 재사용한다 — 새 판정 로직이 아니라, 이미 있는 "부족 영양소 판정"과 "이 끼니의 합계"를 조인한 것뿐이다.
import { buildDeficiencyRows } from './nutrition.js'

// 4개 라벨이 서로 다른 받침 패턴이라("단백질이"/"탄수화물이"/"지방이"는 이, "식이섬유가"는 가) 조사를
// 코드로 추측하는 대신 라벨별 완성 문장 조각을 미리 준비해둔다.
const DEFICIENT_PHRASE = {
  carbs: '탄수화물이',
  protein: '단백질이',
  fat: '지방이',
  fiber: '식이섬유가',
}

// 이 끼니 다음으로 자연스럽게 이어지는 끼니 — "저녁에 채워보세요" 같은 구체적인 안내를 만든다.
const NEXT_MEAL_LABEL = {
  breakfast: '점심',
  lunch: '저녁',
  dinner: '다음 날 아침',
  etc: '다음 끼니',
}

// recommended: 하루 권장 영양정보(effectiveRecommended). mealTotal: 이 급식 한 끼의 영양 합계
// (하루 누적이 아니라 이 끼니 하나만 — "이 급식이 하루치 중 얼마나 채웠는지"를 보려는 것이라
// 다른 끼니와 합치면 그 의미가 흐려진다). mealType: 다음 끼니 안내 문구에만 쓴다.
// 반환: { rows, message } — rows가 비어 있으면(4대 목표 영양소를 이 한 끼로 충분히 채웠으면) 축하
// 메시지를, 아니면 가장 부족했던 영양소 기준 안내 메시지를 만든다.
export function buildSchoolMealSummary(recommended, mealTotal, mealType) {
  const rows = buildDeficiencyRows(recommended, mealTotal, { max: 3 })

  if (rows.length === 0) {
    return { rows, message: '이 급식으로 필요한 영양을 고루 채웠어요.' }
  }

  const worst = rows[0]
  const phrase = DEFICIENT_PHRASE[worst.key] ?? `${worst.label}이`
  const nextMeal = NEXT_MEAL_LABEL[mealType] ?? NEXT_MEAL_LABEL.etc
  return { rows, message: `이 급식엔 ${phrase} 부족했어요. ${nextMeal}에 채워보세요.` }
}
