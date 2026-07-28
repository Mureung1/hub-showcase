// 성별·연령대별 "하루 평균 영양소 섭취량" 대표값(6대 영양소). 리더보드(오늘 내 섭취 vs 한국 평균) 전용.
//
// 출처/성격: 질병관리청 국민건강영양조사(KNHANES) 수준의 성별·연령대별 1일 평균 섭취량을 참고한
// 대표값이다. 실시간 조회가 아니라 공개 통계 수준의 근삿값이며, 개인별 "권장량"(calcRecommendedNutrients,
// standardIntake.js의 기준값)과는 다른 개념 — 이건 "실제로 국민이 평균적으로 얼마나 먹는지"다. 정확한
// 최신 수치가 필요하면 KNHANES 공개 통계로 이 표만 갱신하면 되고, 화면(NationalComparisonCard)은
// 손댈 필요가 없다.
//
// 단위: calories(kcal), protein·carbs·fat·fiber(g), sodium(mg).

const AGE_BRACKETS = [
  { min: 19, max: 29, key: '19-29' },
  { min: 30, max: 49, key: '30-49' },
  { min: 50, max: 64, key: '50-64' },
  { min: 65, max: Infinity, key: '65+' },
]

const AVERAGE_TABLE = {
  male: {
    '19-29': { calories: 2500, protein: 95, carbs: 340, fat: 70, fiber: 25, sodium: 4000 },
    '30-49': { calories: 2400, protein: 90, carbs: 320, fat: 65, fiber: 27, sodium: 3900 },
    '50-64': { calories: 2100, protein: 80, carbs: 300, fat: 52, fiber: 27, sodium: 3600 },
    '65+': { calories: 1800, protein: 68, carbs: 280, fat: 42, fiber: 24, sodium: 3100 },
  },
  female: {
    '19-29': { calories: 1800, protein: 68, carbs: 250, fat: 55, fiber: 20, sodium: 2900 },
    '30-49': { calories: 1750, protein: 65, carbs: 245, fat: 50, fiber: 21, sodium: 2900 },
    '50-64': { calories: 1650, protein: 62, carbs: 250, fat: 42, fiber: 22, sodium: 2800 },
    '65+': { calories: 1500, protein: 55, carbs: 240, fat: 33, fiber: 20, sodium: 2500 },
  },
}

function findAgeBracket(age) {
  return AGE_BRACKETS.find((b) => age >= b.min && age <= b.max) ?? AGE_BRACKETS[0]
}

// 성별·나이에 해당하는 한국 평균 하루 섭취량(6대 영양소). sex/age가 없으면 null(호출부가 안내 문구로 폴백).
//
// 6~18세는 의도적으로 null을 반환한다(트랙 3 §1) — 위 AVERAGE_TABLE은 19세 미만 구간이 아예 없어,
// 예전엔 findAgeBracket이 못 찾은 나이를 전부 AGE_BRACKETS[0](19-29)으로 조용히 폴백시켰다(초·중·고
// 학생이 성인 평균과 비교되던 버그). 이 표는 calcRecommendedNutrients처럼 공식에서 계산하는 값이
// 아니라 "실제 국민건강영양조사 통계"라 확인 못 한 수치를 지어낼 수 없다 — 대신 명확히
// "비교 대상 없음"으로 알린다(NationalComparisonCard가 이 null을 안내 문구로 보여준다).
export function getKoreanAverageIntake(sex, age) {
  const numericAge = Number(age)
  if (!Number.isFinite(numericAge) || numericAge <= 0) return null
  if (numericAge < 19) return null
  const sexKey = sex === 'female' ? 'female' : sex === 'male' ? 'male' : null
  if (!sexKey) return null
  return AVERAGE_TABLE[sexKey][findAgeBracket(numericAge).key]
}
