// MY 탭 개편(리더보드 화면) — 순수 함수. rank는 get_xp_leaderboard()가 이미 1부터 연속으로 매겨
// 반환하므로(row_number() 기반) 별도 정렬 없이 범위 필터만 하면 된다. 상위 3명은 LeaderboardPodium이
// 따로 그리므로, 호출부가 필요하면 그 3명을 걸러내는 건 호출부 책임이다(이 함수는 순수 "내 순위
// 주변" 윈도우 계산만 한다).
export function windowAroundMe(rows, meRank, radius = 2) {
  if (!(meRank > 0)) return []
  const lo = meRank - radius
  const hi = meRank + radius
  return rows.filter((row) => row.rank >= lo && row.rank <= hi)
}
