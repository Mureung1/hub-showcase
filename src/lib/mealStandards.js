// 한 끼 총량이 말이 되는가 — **판(plate) 단위** 검증.
//
// ── 왜 항목 단위 보정으로는 부족한가 ──
// clampToPlausibleNutrients는 "이 음식 하나의 수치가 그 음식의 현실 범위 안인가"를 본다. 그런데
// 급식 트레이가 통째로 1.5배 틀리는 사고는 항목마다 조금씩 어긋난 결과라, 어느 항목도 개별
// 범위를 벗어나지 않으면서 합계만 크게 틀린다. 그 계통 오차는 합계에서만 보인다.
//
// ── 기준값의 출처 ──
// 학교급식은 **학교급식법 시행규칙 별표3(학교급식 영양관리기준)**이 학교급별 한 끼 에너지를
// 정해두고, 영양(교)사가 그 기준에 맞춰 식단을 짠다. 즉 이건 우리가 지어낸 밴드가 아니라 실제
// 급식이 설계되는 목표값이다. 저장소의 NEIS 실제 샘플로 검증했다 — 중학교 4끼 평균 804kcal
// (기준 800), 고등학교 5끼 평균 803(기준 900), 초등 3끼 평균 674(기준 534~634).
//
// ⚠️ **이 기준으로 값을 자동 보정하지 않는다.** 외부 정답지(NEIS 공식 수치)가 있을 때만 보정하고,
// 여기서는 "이례적이다"라고 알리기만 한다. 정답지 없이 밴드로 값을 깎으면 그게 바로 이 저장소가
// 반복해서 틀린 패턴 — 근거 없는 기준으로 근거 있는 값을 기각하는 것 — 이 된다.
const SCHOOL_MEAL_KCAL = {
  elementaryLower: 534, // 초등 1~3학년
  elementary: 634, // 초등 4~6학년
  middle: 800,
  high: 900,
}

// 기준은 "설계 목표"이고 실제 한 끼는 반찬 구성에 따라 흔들린다. ±35%는 저장소의 NEIS 실제 샘플
// 12끼를 전부 포함하는 최소 폭이다(가장 바깥이 초등 842kcal — 초등 상한 856에 겨우 든다).
// 더 좁히면 정상 급식을 이례적이라고 표시하게 된다.
const SCHOOL_BAND_RATIO = 0.35

// 급식이 아닌 경우 — 법정 기준 같은 근거가 없어 훨씬 넓게 잡는다. 여기 걸리는 건 "한 끼로 볼 수
// 없는 값"(라면 한 개가 3000kcal 등)뿐이어야 한다.
const GENERIC_MEAL_KCAL = { single: [80, 1600], multi_dish: [250, 2200], cafeteria_tray: [300, 1400] }

// NEIS 학교종류(SCHUL_KND_SC_NM) 또는 precisionEngine의 schoolType을 급식 기준 키로 옮긴다.
export function schoolMealStandardKcal(schoolKind) {
  if (typeof schoolKind !== 'string') return null
  if (schoolKind.includes('초등')) return SCHOOL_MEAL_KCAL.elementary // 학년을 모르면 4~6학년 기준
  if (schoolKind.includes('중학')) return SCHOOL_MEAL_KCAL.middle
  if (schoolKind.includes('고등')) return SCHOOL_MEAL_KCAL.high
  const byType = { elementary: SCHOOL_MEAL_KCAL.elementary, middle: SCHOOL_MEAL_KCAL.middle, high: SCHOOL_MEAL_KCAL.high }
  return byType[schoolKind] ?? null
}

// 한 끼 총열량이 그 장면에서 말이 되는 범위인지.
// 반환: { ok, min, max, standard } — standard는 급식 기준이 적용된 경우에만 숫자.
export function plateKcalBand({ sceneType = 'multi_dish', schoolKind = null } = {}) {
  const standard = schoolMealStandardKcal(schoolKind)
  if (standard) {
    return { min: Math.round(standard * (1 - SCHOOL_BAND_RATIO)), max: Math.round(standard * (1 + SCHOOL_BAND_RATIO)), standard }
  }
  const [min, max] = GENERIC_MEAL_KCAL[sceneType] ?? GENERIC_MEAL_KCAL.multi_dish
  return { min, max, standard: null }
}

// 반환: null(정상) 또는 { direction: 'high'|'low', total, min, max, standard, message }
// message는 그대로 화면에 보여줄 수 있는 한국어 문구다.
export function checkPlateTotal(totalCalories, options = {}) {
  const total = Number(totalCalories)
  if (!(total > 0)) return null
  const { min, max, standard } = plateKcalBand(options)
  if (total >= min && total <= max) return null

  const direction = total > max ? 'high' : 'low'
  const reference = standard
    ? `학교급식 한 끼 기준 약 ${standard}kcal`
    : `이런 구성의 한 끼는 보통 ${min}~${max}kcal`
  return {
    direction,
    total: Math.round(total),
    min,
    max,
    standard,
    message: `총 ${Math.round(total)}kcal은 ${reference}보다 ${direction === 'high' ? '많습니다' : '적습니다'}. 사진에 안 담긴 반찬이 있거나 일부 항목이 잘못 인식됐을 수 있어요.`,
  }
}
