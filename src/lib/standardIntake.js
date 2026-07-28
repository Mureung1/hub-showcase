// 한국인 영양섭취기준(KDRIs) 수준의 성별·연령대별 대표값 테이블.
// 실시간 조회가 아니라 "기준표 수준"의 참고값이며, MY 탭의 표준 대비 비교 그래프 전용이다.
import { YOUTH_FIBER_G, YOUTH_PROTEIN_G } from './youthIntake.js'

const AGE_BRACKETS = [
  { min: 19, max: 29, key: '19-29' },
  { min: 30, max: 49, key: '30-49' },
  { min: 50, max: 64, key: '50-64' },
  { min: 65, max: 74, key: '65-74' },
  { min: 75, max: Infinity, key: '75+' },
]

// 청소년(6~18세) 구간 — 트랙 3 §1. youthIntake.js와 같은 4구간을 쓴다(단백질·식이섬유는 그쪽 표를
// 그대로 가져다 쓰고, 여기 이 파일만의 calories는 아래 YOUTH_STANDARD_TABLE에 별도로 둔다).
const YOUTH_AGE_BRACKETS = [
  { min: 6, max: 8, key: '6-8' },
  { min: 9, max: 11, key: '9-11' },
  { min: 12, max: 14, key: '12-14' },
  { min: 15, max: 18, key: '15-18' },
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

// 청소년 에너지필요추정량(kcal) — 이 파일은 위 성인 표처럼 개인 체중·키 없이 "연령대 대표값"만
// 보여주는 비교용 참고표라(youthIntake.js의 EER 회귀식과 달리 개인화하지 않는다), 한국인 영양섭취
// 기준의 소아·청소년 대표 체위 기준 에너지필요추정량을 그대로 옮겼다. 단백질/식이섬유는 이미
// youthIntake.js가 KDRIs 2020 [별표 2] 원문을 정확히 옮겨둔 표가 있으므로 그걸 그대로 가져다 쓴다.
const YOUTH_STANDARD_CALORIES = {
  male: { '6-8': 1700, '9-11': 2000, '12-14': 2500, '15-18': 2700 },
  female: { '6-8': 1500, '9-11': 1800, '12-14': 2000, '15-18': 2000 },
}

const STANDARD_CARBS_G = 130 // 탄수화물 권장섭취량, 전 연령 공통 기준(성인·청소년 모두 동일)
const STANDARD_SODIUM_MG = 2000 // 나트륨 만성질환위험감소섭취량, 전 연령 공통 기준(이 앱의 나트륨 한도와 동일)
const STANDARD_FIBER_G = { male: 30, female: 25 } // 식이섬유 충분섭취량, 이 앱의 calcRecommendedNutrients와 동일 값

function findAgeBracket(age) {
  return AGE_BRACKETS.find((b) => age >= b.min && age <= b.max) ?? AGE_BRACKETS[0]
}

function findYouthAgeBracket(age) {
  return YOUTH_AGE_BRACKETS.find((b) => age >= b.min && age <= b.max) ?? YOUTH_AGE_BRACKETS[0]
}

// 성별·나이에 해당하는 "표준(평균) 하루 섭취기준" 6개 영양소 세트를 반환한다.
export function getStandardIntake(sex, age) {
  const sexKey = sex === 'female' ? 'female' : 'male'
  const numericAge = Number(age) || 19

  if (numericAge >= 6 && numericAge < 19) {
    const bracket = findYouthAgeBracket(numericAge)
    const calories = YOUTH_STANDARD_CALORIES[sexKey][bracket.key]
    return {
      calories,
      protein: YOUTH_PROTEIN_G[sexKey][bracket.key],
      carbs: STANDARD_CARBS_G,
      fat: Math.round((calories * 0.25) / 9 / 5) * 5,
      fiber: YOUTH_FIBER_G[sexKey][bracket.key],
      sodium: STANDARD_SODIUM_MG,
    }
  }

  const bracket = findAgeBracket(numericAge)
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
