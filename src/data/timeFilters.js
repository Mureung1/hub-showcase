// 홈 화면 시간 필터 구간. plan.md 「기능 A」에서 확정된 4구간을 그대로 사용.
// 경계값은 min 이상 max 미만으로 처리 (getTimeFilterId 참고) — 구간끼리 겹치거나 비지 않게.
export const TIME_FILTERS = [
  { id: 'under10', label: '10분 미만', min: 0, max: 10 },
  { id: '10to20', label: '10~20분', min: 10, max: 20 },
  { id: '20to30', label: '20~30분', min: 20, max: 30 },
  { id: 'over30', label: '30분 이상', min: 30, max: Infinity },
]

export function getTimeFilterId(cookTimeMinutes) {
  const filter = TIME_FILTERS.find(({ min, max }) => cookTimeMinutes >= min && cookTimeMinutes < max)
  return filter?.id ?? TIME_FILTERS[TIME_FILTERS.length - 1].id
}
