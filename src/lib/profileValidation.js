// 신체정보 입력값 범위 검증 — Profile.jsx의 isComplete가 "비어있지 않은가"만 보고 나이 999·
// 몸무게 0.1 같은 값을 그대로 calcRecommendedNutrients로 흘려보내던 것을 막는다. 범위는 DB CHECK
// (supabase/schema.sql — age > 0 and age < 150, height_cm > 0, weight_kg > 0)보다 더 좁게 잡아,
// 형식상 통과하지만 현실적으로 말이 안 되는 값을 클라이언트에서 먼저 걸러낸다.
export const AGE_RANGE = { min: 5, max: 120 }
export const HEIGHT_CM_RANGE = { min: 100, max: 250 }
export const WEIGHT_KG_RANGE = { min: 20, max: 300 }

function rangeError(rawValue, range, unit) {
  // 미입력은 검증 대상이 아니다 — 온보딩 중 자연스럽게 거치는 상태라 에러로 취급하지 않는다.
  if (rawValue === '' || rawValue == null) return null
  const num = Number(rawValue)
  if (!Number.isFinite(num) || num < range.min || num > range.max) {
    return `${range.min}~${range.max}${unit} 사이로 입력해주세요.`
  }
  return null
}

// form: { age, heightCm, weightKg } — TextField가 넘기는 문자열 그대로 받는다.
// 반환: { valid, errors: { age, heightCm, weightKg } } — errors의 각 값은 문제없으면 null.
export function validateBodyInfo({ age, heightCm, weightKg } = {}) {
  const errors = {
    age: rangeError(age, AGE_RANGE, '세'),
    heightCm: rangeError(heightCm, HEIGHT_CM_RANGE, 'cm'),
    weightKg: rangeError(weightKg, WEIGHT_KG_RANGE, 'kg'),
  }
  const filled = Boolean(age) && Boolean(heightCm) && Boolean(weightKg)
  const valid = filled && !errors.age && !errors.heightCm && !errors.weightKg
  return { valid, errors }
}
