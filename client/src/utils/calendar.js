// 날짜 키는 항상 로컬 시간 기준으로 만든다.
// toISOString()은 UTC라서 KST 오전 9시 이전 기록이 전날로 밀린다.
export function toDateKey(value) {
  const date = new Date(value)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

// month는 Date와 같은 0부터 시작하는 값.
// 앞쪽 요일 오프셋은 null로 채워서 일요일 시작 그리드를 만든다.
export function buildMonthGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateKey: toDateKey(new Date(year, month, day)) })
  }

  return cells
}
