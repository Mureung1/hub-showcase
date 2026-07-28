// 6주차 §3 — 나트륨 상한형 판정 단일 소스.
//
// 코드 전체를 훑어본 결과(6주차 실행 전 조사): 이 앱엔 "6개 중 4개 충족" 같은 이분법 규칙이 원래
// 없었다 — nutrition.js의 calcDayStatus가 이미 더 정교한 3단계 카운트 기준(good≥5, normal≥2)을
// 쓰고 있었고, 그 판정 자체(나트륨 방향 반전 포함)도 이미 맞았다. 진짜 문제는 "영양소마다 어느
// 방향이 좋은 방향인가"(target: 많을수록 좋음 / limit: 적을수록 좋음)라는 규칙이 여러 파일에
// `key === 'sodium'`으로 따로따로 복제돼 있었다는 것이고, 그중 dietSummary.js(5주차 AI 식습관
// 분석 집계)는 이 반전을 빼먹어서 "나트륨을 적게 먹어 잘하고 있는 날"을 "나트륨 부족"으로 잘못
// 판정해 Gemini 프롬프트에 "더 드세요"로 흘러들어가는 실제 버그였다(사용자 확인 후 진행).
//
// 이 파일은 의도적으로 nutrition.js를 import하지 않는 최하위(leaf) 모듈이다 — nutrition.js를 포함해
// 판정이 필요한 모든 파일이 이 파일 하나만 참조하게 해서 순환 참조 없이 "단일 소스"를 만든다.
// target형 5개(칼로리·단백질·탄수화물·지방·식이섬유)의 권장량은 체중·활동량 등 사람마다 달라
// calcRecommendedNutrients(nutrition.js)가 매번 계산하므로 여기 고정 수치를 두지 않는다 — 나트륨만
// 유일하게 몸무게와 무관한 고정 공중보건 기준치라 threshold를 상수로 둘 수 있다.
export const SODIUM_LIMIT_MG = 2000

export const NUTRIENT_CRITERIA = [
  { key: 'calories', type: 'target' },
  { key: 'protein', type: 'target' },
  { key: 'carbs', type: 'target' },
  { key: 'fat', type: 'target' },
  { key: 'fiber', type: 'target' },
  { key: 'sodium', type: 'limit', threshold: SODIUM_LIMIT_MG },
]

const CRITERIA_BY_KEY = Object.fromEntries(NUTRIENT_CRITERIA.map((c) => [c.key, c]))

// 모르는 키는 target으로 취급한다(방향을 모를 땐 "많을수록 좋다"는 더 흔한 경우로 안전하게 폴백).
export function criterionOf(key) {
  return CRITERIA_BY_KEY[key] ?? { key, type: 'target' }
}

export function isLimitNutrient(key) {
  return criterionOf(key).type === 'limit'
}

// actual/recommended: 실제 섭취량과 권장량(나트륨은 상한). satisfyRatio: target형에서 "충족"으로
// 볼 최소 비율(예: 0.8 = 권장량의 80% 이상이면 충족) — limit형은 항상 "actual <= recommended"만 본다.
//
// 나눗셈이 아니라 직접 비교/곱셈으로 판정한다 — "actual/recommended >= satisfyRatio"(나눗셈 우선)와
// "actual >= recommended*satisfyRatio"(곱셈 우선)는 수학적으로는 같지만 IEEE-754 부동소수점에서는
// 다르다(리뷰에서 실측 발견: recommended=86, actual=68.8일 때 86*0.8===68.8은 참이지만
// 68.8/86===0.7999999999999999로 미충족 판정이 나온다). 이 앱은 원래 곱셈 우선으로 판정하던
// 코드였고, calcDayStatus가 "과거 기록의 판정은 절대 소급해서 바뀌면 안 된다"를 명시적으로
// 전제하므로 원래 계산 순서를 그대로 유지한다.
export function isMet(key, actual, recommended, satisfyRatio = 1) {
  if (!(recommended > 0)) return false
  return isLimitNutrient(key) ? actual <= recommended : actual >= recommended * satisfyRatio
}
