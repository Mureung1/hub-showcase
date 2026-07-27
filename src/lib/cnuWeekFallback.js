// 대학 학식 "C안 하이브리드"(4주차 보강 Step 7-1)의 순수 판정 로직 — 이번 주 전체(5개 식당 × 6일)
// 크롤링 결과와 폴백 JSON 중 무엇을 보여줄지 결정한다. 개별 셀 단위 실패(status:'unknown')는
// cnuWeeklyParser.js가 이미 부분 허용하므로, 여기서는 "크롤링 시도 자체가 전부 성공했는가"만 본다.
//
//   1차: 크롤링 성공(5개 건물 fetch+파싱 전부 성공)  → source: 'live'
//   2차: 크롤링 예외(네트워크/타임아웃/구조 파악 불가) → 폴백 JSON이 있으면 source: 'fallback'
//   3차: 폴백도 없음                                  → source: 'empty' (에러 아님)
//
// liveResult: null(크롤링 예외 — 서버가 try/catch에서 넘겨줌) | { week, days } (성공).
// fallbackWeek: server/data/univ-meals.json에서 읽은 { week, updatedAt, days } | null.
export function resolveCnuWeekResult({ liveResult, fallbackWeek }) {
  if (liveResult) {
    return { source: 'live', week: liveResult.week, days: liveResult.days, updatedAt: null }
  }
  if (fallbackWeek && Array.isArray(fallbackWeek.days) && fallbackWeek.days.length > 0) {
    return { source: 'fallback', week: fallbackWeek.week, days: fallbackWeek.days, updatedAt: fallbackWeek.updatedAt }
  }
  return { source: 'empty', week: null, days: [], updatedAt: null }
}
