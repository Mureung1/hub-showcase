// 단백질·지방이 현실적으로 가능한 양을 넘었을 때의 보정.
//
// ── 무엇이 문제인가 ──
// 기존 보정 둘은 이 오류를 못 잡는다:
//   · applyAtwaterEnsemble — 탄단지의 **합**이 칼로리와 맞는지만 본다. 단백질 40g·탄수 0g·지방 0g도
//     칼로리가 160이면 완벽히 정합이다. 즉 **구성 비율**은 검사하지 않는다.
//   · clampToPlausibleNutrients — foodData에 등록된 60여 종에만 걸린다. 급식·학식 메뉴 대부분은
//     그 표에 없어서 아무 검사도 못 받는다.
// 그 사이로 "한 끼 단백질 42g" 같은 값이 그대로 빠져나간다.
//
// ── 기준값의 출처: KDRI 에너지적정비율(AMDR) ──
// 한국인 영양소 섭취기준은 총 에너지 대비 적정 비율을 정해둔다 — 탄수화물 55~65%, 단백질 7~20%,
// 지방 15~30%. 상한(단백질 20%, 지방 30%)을 **보정 시작점**으로 쓴다. 이 방식의 장점은 기준이
// 절대 그램이 아니라 **그 끼니의 열량에 비례**한다는 것이다: 800kcal 급식 한 끼의 단백질 상한은
// 20% × 800 / 4 = **40g**으로, 사용자가 말한 현실 한계와 정확히 일치한다. 1500kcal 고기 정식이라면
// 같은 규칙이 75g을 허용한다 — 절대값 40g으로 자르면 그런 끼니를 틀리게 만든다.
//
// ── ⚠️ 왜 DB 실측값에는 걸면 안 되는가 (측정으로 확인) ──
// 식약처 DB 11,255건을 전수 조사하니 **단백질 에너지비 35% 초과가 5.5%, 지방 50% 초과가 5.0%**였고,
// 그건 오류가 아니라 진짜 음식이었다 — 가자미찜 단백질 60%, 갈비구이_돼지고기 지방 65%, 갈비탕 67%.
// 여기에 캡을 걸면 §1.5에서 힘들게 도달한 갈비구이_돼지고기 레코드를 스스로 망가뜨린다.
// 그래서 **항목 단위 보정은 AI 추정치에만** 적용하고, DB에서 온 수치는 손대지 않는다.
// 한 끼 **합계**에는 출처와 무관하게 적용한다 — AMDR은 원래 한 끼/하루 단위 기준이고, 개별 음식이
// 치우치는 건 정상이어도 한 끼 전체가 치우치는 건 정상이 아니기 때문이다.
import { getPlausibility } from './foodData.js'

const KCAL_PER_G = { carbs: 4, protein: 4, fat: 9 }

// KDRI 에너지적정비율 상한 = 보정 시작점. 여기까지는 손대지 않는다.
const AMDR_UPPER = { protein: 0.2, fat: 0.3 }

// 이 이상은 물리적으로 도달하지 못하게 하는 점근 상한(에너지비).
//   item  — 음식 하나는 치우칠 수 있다(닭가슴살·삼겹살). 넉넉하게 준다.
//   meal  — 한 끼 전체가 이만큼 치우치는 일은 없다.
const CEILING = {
  item: { protein: 0.35, fat: 0.5 },
  meal: { protein: 0.3, fat: 0.45 },
}

// ── 한 끼 절대량 상한 ─────────────────────────────────────────────────────────
// 에너지비만으로는 부족하다. 판 전체가 과대추정되면 비율은 정상인데 절대량만 비현실적인 상태가
// 되기 때문이다 — 실측된 사고가 정확히 그랬다: 급식 한 판 1021kcal / 단백질 60g은 에너지비로는
// 23%(정상)라 에너지비 캡에 아예 안 걸린다.
//
// 기준: 한국인 1일 단백질 섭취량 평균이 약 75g(국민건강영양조사)이고 KDRI 권장섭취량은 성인
// 남 65g·여 55g이다. 한 끼로 나누면 20~28g이 보통이고, 고기 위주 한 끼가 40g 안팎이다.
// 그래서 40g을 보정 시작점으로 두면 평범한 한 끼는 전혀 안 건드리고 이상치만 눌린다.
// 지방도 같은 논리 — 학교급식 기준 상한(에너지의 30%)이 900kcal 기준 30g이라 35g을 시작점으로 둔다.
const MEAL_ABSOLUTE = {
  protein: { start: 40, ceiling: 65 },
  fat: { start: 35, ceiling: 55 },
}

// 시작점을 넘은 초과분을 상한선 안으로 부드럽게 눌러 담는다. 딱 자르지 않는 이유: 순서가 보존돼야
// 하기 때문이다. 60g과 80g을 둘 다 40g으로 만들면 "더 많이 먹은 쪽"이라는 정보가 사라진다.
// 이 곡선은 시작점에서 연속이고(불연속 점프 없음), 단조증가하며, 상한에 점근한다.
function softCap(value, start, ceiling) {
  if (!(value > start) || !(ceiling > start)) return value
  const headroom = ceiling - start
  return start + headroom * (1 - Math.exp(-(value - start) / headroom))
}

function energyShareCap(calories, key, scope) {
  return {
    start: (calories * AMDR_UPPER[key]) / KCAL_PER_G[key],
    ceiling: (calories * CEILING[scope][key]) / KCAL_PER_G[key],
  }
}

// 항목 단위에서 쓰는 "이 음식은 검증돼 있다" 판정 — foodData에 그 영양소 범위가 등록돼 있으면
// 우리가 확인한 근거이므로 일반 규칙보다 우선한다.
function hasVerifiedRange(foodName, key) {
  return Boolean(getPlausibility(foodName ?? '')?.ranges?.[key])
}

// ── ① 항목 단위 — AI 추정치 전용 ──────────────────────────────────────────────
// isEstimate가 false면(= DB에서 온 실측값) 아무것도 하지 않는다.
// foodData가 그 음식의 그 영양소를 검증해뒀으면 그것도 건너뛴다 — 우리가 확인한 근거가 일반 규칙보다
// 강하다(삼겹살 지방 범위처럼 의도적으로 치우친 값이 등록돼 있다).
//
// 칼로리는 고정하고 줄어든 만큼을 탄수화물이 흡수한다. applyAtwaterEnsemble이 이미 "calories는
// 탄단지 각각의 추정보다 신뢰도가 높다"를 전제로 삼고 있어 같은 규칙을 따른다.
export function capEstimatedMacros(nutrients, { foodName = '', isEstimate = true } = {}) {
  const calories = Number(nutrients?.calories)
  if (!isEstimate || !(calories > 0)) return nutrients

  const result = { ...nutrients }
  let freedKcal = 0

  for (const key of ['protein', 'fat']) {
    const value = Number(result[key])
    if (!(value > 0) || hasVerifiedRange(foodName, key)) continue
    const { start, ceiling } = energyShareCap(calories, key, 'item')
    const capped = softCap(value, start, ceiling)
    if (capped >= value) continue
    freedKcal += (value - capped) * KCAL_PER_G[key]
    result[key] = Math.round(capped * 10) / 10
  }

  if (freedKcal > 0 && typeof result.carbs === 'number') {
    result.carbs = Math.round((result.carbs + freedKcal / KCAL_PER_G.carbs) * 10) / 10
  }
  return result
}

// ── ② 한 끼 단위 — 근거가 약한 항목부터 깎는다 ────────────────────────────────
// 한 항목을 이 비율 넘게 깎지 않는다. 한 끼가 초과한 책임을 항목 하나에 전부 지우면 그 항목이
// 통째로 틀린 값이 된다.
const MAX_ITEM_REDUCTION = 0.4

// 깎는 순서 = 근거가 약한 순. 같은 양을 덜어내더라도 AI 추정치에서 빼는 쪽이 실측값에서 빼는 것보다
// 정보 손실이 적다. (숫자가 작을수록 먼저 깎인다)
function evidenceRank(item) {
  if (item?.source === '식약처DB' || item?.source === '식약처DB(가공)') return 2
  if (item?.source === '레시피DB') return 1
  return 0 // 추정 · 공식(브랜드 추정) · 직접입력 등
}

// items: [{ name, nutrients, source }] — resolveFoodItems가 내는 모양.
// 반환: { items, corrections } — corrections는 실제로 깎인 영양소별 { before, after, ceiling }.
//   변경이 없으면 corrections는 빈 객체이고 items는 **원본 배열 그대로**(참조 동일) 돌려준다.
export function correctMealMacros(items) {
  const list = Array.isArray(items) ? items : []
  const calories = list.reduce((sum, it) => sum + (Number(it?.nutrients?.calories) || 0), 0)
  if (!(calories > 0)) return { items: list, corrections: {} }

  const corrections = {}
  const removedKcalByIndex = new Map()
  const next = list.map((it) => ({ ...it, nutrients: { ...it.nutrients } }))

  // protein을 먼저 깎으면 그만큼 열량도 줄어야 정합이 맞다(끝에서 항목별 calories에 반영한다). fat의
  // 에너지비 상한(energyShareCap)은 그 줄어든 열량을 기준으로 계산해야 하므로, 루프 안에서 즉시
  // 반영되는 이 변수를 쓴다 — calories(원본 합계)를 그대로 쓰면 protein 보정 후에도 fat 상한이
  // 보정 전 칼로리 기준으로 계산돼 실제보다 느슨해진다(리뷰에서 발견, 영향은 경미하다).
  let runningCalories = calories

  for (const key of ['protein', 'fat']) {
    const total = next.reduce((sum, it) => sum + (Number(it.nutrients[key]) || 0), 0)
    if (!(total > 0)) continue

    // foodData가 그 음식의 그 영양소를 검증해둔 항목은 보정 대상에서 뺀다 — 항목 단위 규칙과 같은
    // 이유다(가자미찜 단백질 60%, 갈비구이 지방 65%는 진짜 값이라 일반 규칙으로 깎으면 안 된다).
    // 검증분만으로 이미 상한을 넘으면 아무것도 하지 않는다: 검증된 근거가 일반 규칙을 이긴다.
    const isExempt = (it) => hasVerifiedRange(it?.name, key)
    const exemptTotal = next.reduce((sum, it) => sum + (isExempt(it) ? Number(it.nutrients[key]) || 0 : 0), 0)

    // 에너지비 상한과 절대량 상한 중 **더 엄격한 쪽**을 쓴다. 전자는 구성 비율이 치우친 경우를,
    // 후자는 판 전체가 과대추정된 경우를 잡는다 — 둘은 서로 다른 실패를 막는다.
    const byEnergy = energyShareCap(runningCalories, key, 'meal')
    const abs = MEAL_ABSOLUTE[key]
    const target = Math.min(softCap(total, byEnergy.start, byEnergy.ceiling), softCap(total, abs.start, abs.ceiling))
    const ceiling = Math.min(byEnergy.ceiling, abs.ceiling)
    if (target >= total || exemptTotal >= target) continue

    let toRemove = total - target
    let removed = 0
    // 근거가 약한 항목부터, 각 항목은 최대 MAX_ITEM_REDUCTION까지만.
    const order = next
      .map((it, i) => ({ i, rank: evidenceRank(it), amount: isExempt(it) ? 0 : Number(it.nutrients[key]) || 0 }))
      .sort((a, b) => a.rank - b.rank)
    for (const { i, amount } of order) {
      if (toRemove <= 0) break
      if (!(amount > 0)) continue
      const take = Math.min(toRemove, amount * MAX_ITEM_REDUCTION)
      next[i].nutrients[key] = Math.round((amount - take) * 10) / 10
      removedKcalByIndex.set(i, (removedKcalByIndex.get(i) ?? 0) + take * KCAL_PER_G[key])
      removed += take
      toRemove -= take
    }
    if (removed <= 0) continue
    runningCalories = Math.max(0, runningCalories - removed * KCAL_PER_G[key])
    // 항목별 상한(40%) 때문에 목표까지 다 못 깎을 수 있다 — 그때는 깎은 만큼만 정직하게 기록한다.
    corrections[key] = {
      before: Math.round(total * 10) / 10,
      after: Math.round((total - removed) * 10) / 10,
      ceiling: Math.round(ceiling * 10) / 10,
      reachedTarget: toRemove <= 0.05,
    }
  }

  if (Object.keys(corrections).length === 0) return { items: list, corrections: {} }

  // 단백질·지방을 덜어냈으면 그만큼 열량도 줄어든다 — 같은 출처에서 나온 값이라 과대추정이었다면
  // 열량도 함께 과대였다고 보는 게 일관적이다(빼놓으면 Atwater 정합이 깨진다).
  for (const [i, kcal] of removedKcalByIndex) {
    const current = Number(next[i].nutrients.calories)
    if (current > 0) next[i].nutrients.calories = Math.max(0, Math.round((current - kcal) * 10) / 10)
  }
  return { items: next, corrections }
}
