// FR-18 — 지도 탭 음식 듀얼 비교(순수 함수). 두 식당의 예상 섭취량(place.expected, MapPage.jsx의
// attachExpectedIntake가 이미 채워둔 값)을 놓고 영양소별 승/패를 매긴다. 새 판정 기준을 만들지 않고
// nutrientCriteria.js의 isLimitNutrient(target/limit 방향)를 그대로 재사용한다.
import { isLimitNutrient } from './nutrientCriteria.js'
import { NUTRIENT_LABELS } from './nutrition.js'

// limit형(나트륨): 더 적게 추가되는 쪽이 승리(상한 초과 위험이 적음).
// target형(칼로리·단백질·탄수화물·지방·식이섬유): 오늘 아직 부족한 만큼(remaining)을 더 많이
// 채워주는 쪽이 승리 — remaining을 넘는 초과분은 승패에 반영하지 않는다(과다 섭취를 부추기지
// 않기 위해 min(expected, remaining)으로 캡). remaining이 이미 0(오늘 그 영양소는 충분히 채움)이면
// 반대로 "적게 추가되는 쪽"이 승리(더 먹을 필요가 없으니 과식 방지가 기준이 된다).
function decideWinner(key, aValue, bValue, todayTotal, recommended) {
  if (isLimitNutrient(key)) {
    if (aValue === bValue) return 'tie'
    return aValue < bValue ? 'A' : 'B'
  }

  const target = Number(recommended?.[key])
  const already = Number(todayTotal?.[key]) || 0
  const remaining = target > 0 ? Math.max(0, target - already) : 0

  if (remaining > 0) {
    const aFill = Math.min(aValue, remaining)
    const bFill = Math.min(bValue, remaining)
    if (aFill === bFill) return 'tie'
    return aFill > bFill ? 'A' : 'B'
  }

  if (aValue === bValue) return 'tie'
  return aValue < bValue ? 'A' : 'B'
}

// expectedA/expectedB: NutrientSet의 일부(키가 없거나 숫자가 아닌 항목은 비교에서 제외).
// todayTotal/recommended: nutrition.js의 NutrientSet(부족분 계산용, 없으면 target형은 "적게가 승리"로 처리).
export function compareTwoPlaces(expectedA, expectedB, { todayTotal, recommended } = {}) {
  const rows = []
  for (const { key, label, unit } of NUTRIENT_LABELS) {
    const aValue = expectedA?.[key]
    const bValue = expectedB?.[key]
    if (typeof aValue !== 'number' || typeof bValue !== 'number') continue
    rows.push({ key, label, unit, aValue, bValue, winner: decideWinner(key, aValue, bValue, todayTotal, recommended) })
  }

  const aWins = rows.filter((r) => r.winner === 'A').length
  const bWins = rows.filter((r) => r.winner === 'B').length
  const overallWinner = aWins === bWins ? 'tie' : aWins > bWins ? 'A' : 'B'

  return { rows, overallWinner }
}
