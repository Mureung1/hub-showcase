// 한국인 영양섭취기준(KDRIs) 수준의 성별·연령대별 대표값 테이블.
// 실시간 조회가 아니라 "기준표 수준"의 참고값이며, MY 탭의 표준 대비 비교 그래프 전용이다.

const AGE_BRACKETS = [
  { min: 19, max: 29, key: '19-29' },
  { min: 30, max: 49, key: '30-49' },
  { min: 50, max: 64, key: '50-64' },
  { min: 65, max: 74, key: '65-74' },
  { min: 75, max: Infinity, key: '75+' },
]

// 에너지 필요추정량(EER, kcal)·단백질 권장섭취량(RNI, g). 성별·연령대별로 차이가 커서 이 둘만 구간화한다.
const STANDARD_TABLE = {
  male: {
    '19-29': { calories: 2600, protein: 65 },
    '30-49': { calories: 2500, protein: 65 },
    '50-64': { calories: 2200, protein: 60 },
    '65-74': { calories: 2000, protein: 60 },
    '75+': { calories: 1900, protein: 60 },
  },
  female: {
    '19-29': { calories: 2000, protein: 55 },
    '30-49': { calories: 1900, protein: 50 },
    '50-64': { calories: 1700, protein: 50 },
    '65-74': { calories: 1600, protein: 50 },
    '75+': { calories: 1500, protein: 50 },
  },
}

const STANDARD_CARBS_G = 130 // 탄수화물 권장섭취량, 성인 공통 기준
const STANDARD_SODIUM_MG = 2000 // 나트륨 만성질환위험감소섭취량, 성인 공통 기준(이 앱의 나트륨 한도와 동일)
const STANDARD_FIBER_G = { male: 30, female: 25 } // 식이섬유 충분섭취량, 이 앱의 calcRecommendedNutrients와 동일 값

function findAgeBracket(age) {
  return AGE_BRACKETS.find((b) => age >= b.min && age <= b.max) ?? AGE_BRACKETS[0]
}

// 성별·나이에 해당하는 "표준(평균) 하루 섭취기준" 6개 영양소 세트를 반환한다.
export function getStandardIntake(sex, age) {
  const sexKey = sex === 'female' ? 'female' : 'male'
  const bracket = findAgeBracket(Number(age) || 19)
  const base = STANDARD_TABLE[sexKey][bracket.key]

  return {
    calories: base.calories,
    protein: base.protein,
    carbs: STANDARD_CARBS_G,
    fat: Math.round((base.calories * 0.25) / 9 / 5) * 5,
    fiber: STANDARD_FIBER_G[sexKey],
    sodium: STANDARD_SODIUM_MG,
  }
}
