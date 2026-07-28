// 연속 기록(streak) — 트랙 1 §1. dataStore.getMealsByDateRange로 이미 얻는 날짜 목록에서 파생되는
// 값이라 별도 저장소·스키마 변경이 없다. "기록한 날" = 그 날짜에 저장된 끼니가 1개 이상 있는 날.

const MS_PER_DAY = 24 * 60 * 60 * 1000

// 'YYYY-MM-DD' -> UTC 자정 기준 정수 일련번호. 로컬 타임존 Date 파싱에 기대지 않아(DST/자정 경계
// 근처 오프바이원 없이) 날짜 산술을 뺄셈만으로 안전하게 할 수 있다.
function dateKeyToDayNumber(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

// recordedDateKeys: 끼니가 있는 날짜들의 'YYYY-MM-DD' 키(순서/중복 무관).
// todayKey: 오늘 날짜 키 — src/lib/records.js의 toDateKey(new Date())로 만든 값과 같은 포맷이어야
// 리더보드 SQL이 이미 겪은 것과 같은 KST 경계 함정(UTC 기준 "오늘"이 실제와 어긋나는 문제)을 피한다.
// 반환: { current, longest, recordedToday }.
// current: 오늘부터(오늘 미기록이면 어제부터) 거꾸로 빈 날 없이 이어지는 연속 일수 — 오늘 아직
//   기록이 없어도 자정 전까지의 자연스러운 상태이므로 어제까지의 연속을 끊긴 것으로 세지 않는다.
// longest: 주어진 날짜 전체를 통틀어 가장 긴 연속 구간(오늘과 무관, 과거 최고 기록).
export function calcStreak(recordedDateKeys, todayKey) {
  const days = new Set(recordedDateKeys.map(dateKeyToDayNumber))
  const todayNum = dateKeyToDayNumber(todayKey)
  const recordedToday = days.has(todayNum)

  let current = 0
  let cursor = recordedToday ? todayNum : todayNum - 1
  while (days.has(cursor)) {
    current += 1
    cursor -= 1
  }

  let longest = 0
  let run = 0
  let prevDay = null
  for (const day of [...days].sort((a, b) => a - b)) {
    run = prevDay !== null && day === prevDay + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    prevDay = day
  }

  return { current, longest, recordedToday }
}
