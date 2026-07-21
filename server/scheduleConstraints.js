// 인접 세션 부위 중복 금지 하드 제약(같은 부위 최소 48시간 간격, ACSM 권고 기준).
// RoutineDay엔 실제 날짜가 없고 dayOfWeek(요일)만 있어서, "48시간"을 "요일 인덱스 차이"로 근사한다.
// 요일 차이가 2 이상이면 이미 48시간 이상이 보장되므로, 위반 가능성은 항상 "바로 이웃한 요일(차이 1)"에서만 생긴다.
// 그래서 이웃 요일 두 개(앞/뒤)만 검사하면 충분하다 — 이 근사가 성립하는 이유이자 한계.
export const WEEK_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// days: 그 주 전체 요일의 [{ dayOfWeek, targetAreas: string[] }] 배열(후보 요일도 포함).
// candidateDayOfWeek: 재배치를 검토 중인 빈 휴식일.
// areasToPlace: 그 후보에 새로 배치하려는 세션이 쓰는 부위(Exercise.targetArea) 목록.
// 반환: true면 하드 제약 위반(이 후보는 못 씀), false면 통과.
export function violatesAdjacentAreaRule({
  days,
  candidateDayOfWeek,
  areasToPlace,
}) {
  const candidateIndex = WEEK_ORDER.indexOf(candidateDayOfWeek)

  const neighborIndexes = [candidateIndex - 1, candidateIndex + 1].filter(
    (i) => i >= 0 && i <= 6,
  )

  return neighborIndexes.some((i) => {
    const neighborDayOfWeek = WEEK_ORDER[i]
    const neighbor = days.find((d) => d.dayOfWeek === neighborDayOfWeek)
    if (!neighbor) return false
    return neighbor.targetAreas.some((area) => areasToPlace.includes(area))
  })
}
