// 공식 수치가 있는 영양소는 **그대로 쓰고**, 없는 것만 남은 열량에서 역산한다.
//
// ── 왜 필요한가 ──
// NEIS 급식 식단정보는 영양(교)사가 표준레시피로 산출해 공시한 값이라 우리 추정보다 정확하다.
// 그런데 학교마다 공개 항목이 다르다 — 열량은 항상 있지만 탄수화물·단백질·지방은 있을 때도 없을
// 때도 있고, **식이섬유와 나트륨은 NEIS에 아예 없다**.
//
// 예전 방식은 공식 수치가 있는 항목만 비율로 스케일하고 나머지는 원래 추정값을 그대로 뒀다. 그래서
// 우리 추정 합계가 1000kcal인데 공식이 800kcal이면 열량·단백질은 0.8배로 줄고 나트륨은 1.0배로
// 남는, 서로 앞뒤가 안 맞는 결과가 나왔다.
//
// 이 모듈은 순서를 명확히 한다:
//   ① 공식 값이 있으면 **손대지 않는다**(확정).
//   ② 공식 열량에서 확정된 다량영양소의 열량을 빼고, **남은 열량을 미확정 다량영양소에 배분**한다.
//      배분 비율은 우리 추정치의 에너지 구성을 따르고, 추정치가 없으면 KDRI 에너지적정비율을 쓴다.
//   ③ 열량과 무관한 항목(식이섬유·나트륨)은 열량이 줄어든 비율만큼 함께 줄인다 — 같은 한 끼를
//      과대추정했다면 그 항목들도 같이 과대였다고 보는 게 일관적이다.
//
// 예: 공식 { 열량 800, 단백질 15 } → 단백질이 60kcal을 쓰므로 남은 740kcal을 탄수·지방에 배분한다.

const KCAL_PER_G = { carbs: 4, protein: 4, fat: 9 }
const MACRO_KEYS = ['carbs', 'protein', 'fat']
const ALL_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium']

// KDRI 에너지적정비율의 중앙값 — 추정치가 배분 근거를 못 줄 때만 쓰는 폴백
// (탄수 55~65%, 단백질 7~20%, 지방 15~30%).
const KDRI_ENERGY_SHARE = { carbs: 0.6, protein: 0.15, fat: 0.25 }

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

// estimate: 우리 엔진이 계산한 합계(6영양소). anchors: 공식 수치(일부만 있어도 된다).
// 반환: { nutrients, confirmed, derived } — confirmed는 공식 그대로 쓴 키, derived는 역산한 키.
export function applyOfficialAnchors(estimate, anchors) {
  const confirmed = ALL_KEYS.filter((key) => isNumber(anchors?.[key]))
  if (confirmed.length === 0) return { nutrients: { ...estimate }, confirmed: [], derived: [] }

  const result = {}
  for (const key of ALL_KEYS) result[key] = isNumber(anchors[key]) ? anchors[key] : (estimate?.[key] ?? null)

  const calories = result.calories
  if (!isNumber(calories) || calories <= 0) return { nutrients: result, confirmed, derived: [] }

  // ② 남은 열량을 미확정 다량영양소에 배분
  const unknownMacros = MACRO_KEYS.filter((key) => !isNumber(anchors[key]))
  const knownMacroKcal = MACRO_KEYS.filter((key) => isNumber(anchors[key])).reduce((sum, key) => sum + anchors[key] * KCAL_PER_G[key], 0)
  const residual = calories - knownMacroKcal

  const derived = []
  if (unknownMacros.length > 0) {
    if (residual <= 0) {
      // 확정된 다량영양소만으로 이미 공식 열량을 넘겼다 — 나머지는 0으로 둔다(음수를 만들지 않는다).
      for (const key of unknownMacros) {
        result[key] = 0
        derived.push(key)
      }
    } else {
      // 배분 비율: 우리 추정치의 에너지 구성 → 없으면 KDRI 적정비율.
      const weights = {}
      let weightSum = 0
      for (const key of unknownMacros) {
        const fromEstimate = isNumber(estimate?.[key]) ? estimate[key] * KCAL_PER_G[key] : 0
        weights[key] = fromEstimate
        weightSum += fromEstimate
      }
      if (weightSum <= 0) {
        weightSum = 0
        for (const key of unknownMacros) {
          weights[key] = KDRI_ENERGY_SHARE[key]
          weightSum += weights[key]
        }
      }
      for (const key of unknownMacros) {
        result[key] = Math.round(((residual * (weights[key] / weightSum)) / KCAL_PER_G[key]) * 10) / 10
        derived.push(key)
      }
    }
  }

  // ③ 열량과 무관한 항목은 열량이 조정된 비율만큼 함께 조정한다.
  const estimatedCalories = Number(estimate?.calories)
  if (estimatedCalories > 0) {
    const scale = calories / estimatedCalories
    for (const key of ['fiber', 'sodium']) {
      if (isNumber(anchors[key]) || !isNumber(estimate?.[key])) continue
      result[key] = Math.round(estimate[key] * scale * 10) / 10
      derived.push(key)
    }
  }

  return { nutrients: result, confirmed, derived }
}

function round2(n) {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

// applyOfficialAnchors는 **합계**만 확정/역산한다 — 항목별 수치는 그대로라 합계와 항목 합이
// 어긋난다. 이 함수가 그 항목들을 합계와 같은 비율로 나눠 맞춘다(server/nutrition/precisionEngine.js
// 와 src/pages/Analyze.jsx 사진 분석 경로가 공유한다 — 예전엔 후자에 이 단계가 아예 없어서, NEIS
// 공식 수치를 fetchMenuPrior가 받아오고도 사진으로 급식을 분석하면 전혀 반영되지 않았다).
// items: [{ nutrients: {...} }] (참조로 직접 수정). referenceTotals: 목표 합계. currentTotal: 현재 합계.
// 반환: 실제로 적용한 영양소별 배율(scales) — 아무것도 스케일할 게 없으면 null.
export function applyProportionalCalibration(items, referenceTotals, currentTotal) {
  if (!(currentTotal?.calories > 0)) return null

  const scales = {}
  for (const key of ALL_KEYS) {
    const reference = referenceTotals?.[key]
    const current = currentTotal?.[key]
    if (typeof reference === 'number' && reference > 0 && typeof current === 'number' && current > 0) {
      scales[key] = reference / current
    }
  }
  if (Object.keys(scales).length === 0) return null

  for (const item of items) {
    for (const key of ALL_KEYS) {
      if (scales[key] && typeof item.nutrients?.[key] === 'number') {
        item.nutrients[key] = round2(item.nutrients[key] * scales[key])
      }
    }
  }
  return scales
}
