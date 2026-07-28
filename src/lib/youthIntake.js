// 청소년(6~18세) 하루 권장 섭취량 — 트랙 3 §1. nutrientCriteria.js와 같은 leaf 모듈 패턴(아무것도
// import 안 함, nutrition.js가 이 파일 하나만 참조)이라 순환 참조가 없다.
//
// [왜 이 파일이 필요했나] standardIntake.js/koreanAverageIntake.js의 AGE_BRACKETS가 19세부터
// 시작해 그 미만은 전부 `?? AGE_BRACKETS[0]`로 성인(19-29) 값에 조용히 폴백했고, calcBMR도 성인용
// Mifflin-St Jeor 공식을 나이 무관하게 적용했다 — 초·중·고 급식이 이 앱의 간판 기능인데 정작 그
// 연령대의 권장량이 전부 성인 값이었다.
//
// [적용 범위를 3~18세가 아니라 6~18세로 좁힌 이유] 이 앱의 실사용자는 초등학생부터다(3~5세 유아가
// 사진 분석 앱을 직접 쓰는 시나리오가 없다) — occupation/school 옵션에도 유아 구간이 없다. 게다가
// 정부 공식 자료(한국인 영양섭취기준 2020년, [별표 2])에서 유아(1~2세/3~5세) 행은 6~18세 행과
// 표 레이아웃이 달라(리놀레산 등 필수지방산 열이 추가로 끼어듦) 신뢰도 높게 옮겨적기 어려웠다.
// 6세 미만은 기존처럼 성인 공식으로 폴백한다 — 이미 있던 문제를 그 구간에서만 아직 못 고쳤을
// 뿐, 새로 악화시키는 건 아니다.
//
// [수치 출처]
// - 단백질 권장섭취량·식이섬유 충분섭취량: 사단법인 한국영양학회, 한국인 영양섭취기준(2020년)
//   [별표 2](법제처 국가법령정보센터 게재본)을 직접 읽어 옮겼다 — 정부 공식 수치 그대로다.
// - 에너지필요추정량(EER): 이 앱의 성인 계산(calcBMR)도 KDRIs 회귀식이 아니라 국제적으로 널리
//   쓰이는 Mifflin-St Jeor 공식을 쓰는 것과 같은 방침으로, 미국 IOM(2005) 소아·청소년 EER 회귀식을
//   쓴다(체중·키·나이·활동수준으로 개인별 계산 — KDRIs도 이 산출 방법론에 기반한다). "기준체위" 1개
//   숫자를 모든 아동에게 붙이는 대신, 성인처럼 실제 체중·키를 반영한다.
// - 탄수화물·지방: 성인(calcRecommendedNutrients)과 똑같이 계산된 열량(EER)의 %(MACRO_RATIO)로
//   구한다 — KDRIs 표의 "130g"은 뇌가 쓰는 포도당의 생리적 최소량이지, 총 섭취열량에 비례하는
//   목표치가 아니다(그래서 이 값 하나로는 활동량이 다른 두 사람을 구분 못 한다). 성인 계산도 이미
//   그 130g을 그대로 쓰지 않고 %로 계산하므로, 여기서도 같은 방식을 유지해야 두 함수가 일관된다.
// - 나트륨 한도: 성인과 동일(2000mg). 이 앱은 성인 기준에서도 이미 KDRIs 충분섭취량(1500mg)이
//   아니라 더 단순한 공중보건 권고치를 쓰고 있어(WHO 권고와 유사) 같은 단순화를 유지한다 —
//   연령별로 정밀하지만 출처를 자신 있게 옮기지 못한 수치를 지어내는 것보다, 이미 앱이 쓰던
//   근사치를 그대로 넓히는 편이 안전하다.

export const YOUTH_MIN_AGE = 6
export const YOUTH_MAX_AGE = 18

export function isYouthAge(age) {
  const n = Number(age)
  return Number.isFinite(n) && n >= YOUTH_MIN_AGE && n <= YOUTH_MAX_AGE
}

const YOUTH_AGE_BRACKETS = [
  { min: 6, max: 8, key: '6-8' },
  { min: 9, max: 11, key: '9-11' },
  { min: 12, max: 14, key: '12-14' },
  { min: 15, max: 18, key: '15-18' },
]

export function findYouthAgeBracket(age) {
  return YOUTH_AGE_BRACKETS.find((b) => age >= b.min && age <= b.max) ?? YOUTH_AGE_BRACKETS[0]
}

// 단백질 권장섭취량(g) — KDRIs 2020, [별표 2] 그대로.
const YOUTH_PROTEIN_G = {
  male: { '6-8': 35, '9-11': 50, '12-14': 60, '15-18': 65 },
  female: { '6-8': 35, '9-11': 45, '12-14': 55, '15-18': 55 },
}

// 식이섬유 충분섭취량(g) — KDRIs 2020, [별표 2] 그대로.
const YOUTH_FIBER_G = {
  male: { '6-8': 25, '9-11': 25, '12-14': 30, '15-18': 30 },
  female: { '6-8': 20, '9-11': 25, '12-14': 25, '15-18': 20 },
}

// nutrition.js의 MACRO_RATIO/KCAL_PER_GRAM/SODIUM_LIMIT_MG와 값을 반드시 동일하게 유지할 것
// (순환 참조를 피하려고 leaf 모듈로 분리했을 뿐, 기준 자체는 하나여야 한다).
const CARBS_RATIO = 0.5
const FAT_RATIO = 0.3
const KCAL_PER_GRAM_CARBS = 4
const KCAL_PER_GRAM_FAT = 9
const YOUTH_SODIUM_MG = 2000 // 성인과 동일한 단순화(위 출처 설명 참고).

// IOM(2005) 소아·청소년 EER 회귀식의 신체활동계수(PA). 이 앱은 활동량을 3단계(low/moderate/high)로만
// 받으므로 IOM의 4단계(비활동/저활동/활동/고활동) 중 저활동·활동만 매핑해 쓴다 — 성인 쪽
// ACTIVITY_FACTORS(1.375/1.55/1.725, 비율로 1/1.127/1.255)와 비슷한 상대 격차를 유지하기 위해서다.
const YOUTH_PA = {
  male: { low: 1.0, moderate: 1.13, high: 1.26 },
  female: { low: 1.0, moderate: 1.16, high: 1.31 },
}

// IOM(2005) EER 회귀식. 3~8세와 9~18세가 계수가 달라(성장에 따른 에너지축적량이 20→25kcal로 바뀜)
// 나이로 분기한다 — 이 앱의 적용 범위는 6~18세지만, 식 자체는 3세부터 유효해 그대로 옮겼다.
function calcYouthEER({ age, sex, weightKg, heightCm, activity }) {
  const heightM = heightCm / 100
  const pa = YOUTH_PA[sex]?.[activity] ?? YOUTH_PA[sex].moderate
  const deposition = age <= 8 ? 20 : 25

  return sex === 'male'
    ? 88.5 - 61.9 * age + pa * (26.7 * weightKg + 903 * heightM) + deposition
    : 135.3 - 30.8 * age + pa * (10.0 * weightKg + 934 * heightM) + deposition
}

// nutrition.js의 calcRecommendedNutrients와 같은 반환 모양(6대 영양소)을 돌려준다 — isYouthAge(age)일
// 때만 그쪽에서 이 함수로 분기하므로, 호출부가 두 함수의 차이를 몰라도 된다.
// conditions(기저질환) 보정은 여기서 받지 않는다 — 성인용 당뇨 보정("MVP, 얇게"로 이미 표시된
// 휴리스틱)을 소아·청소년에게 그대로 적용할 근거가 없다.
export function calcYouthRecommendedNutrients({ age, heightCm, weightKg, sex, activity }) {
  const sexKey = sex === 'female' ? 'female' : 'male'
  const bracket = findYouthAgeBracket(age)
  const eer = calcYouthEER({ age, sex: sexKey, weightKg, heightCm, activity })

  return {
    calories: Math.round(eer),
    protein: YOUTH_PROTEIN_G[sexKey][bracket.key],
    carbs: Math.round((eer * CARBS_RATIO) / KCAL_PER_GRAM_CARBS),
    fat: Math.round((eer * FAT_RATIO) / KCAL_PER_GRAM_FAT),
    fiber: YOUTH_FIBER_G[sexKey][bracket.key],
    sodium: YOUTH_SODIUM_MG,
  }
}

export { YOUTH_FIBER_G, YOUTH_PROTEIN_G, YOUTH_SODIUM_MG }
