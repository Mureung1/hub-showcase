export function formatShortDate(date) {
  if (typeof date !== 'string') return '미정'
  const match = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/)
  if (!match) return '미정'

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const daysInMonth = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0

  return day >= 1 && day <= daysInMonth ? `${monthText}.${dayText}` : '미정'
}

export function formatPeriod(startDate, endDate) {
  if (!startDate || !endDate) return '미정'
  return `${formatShortDate(startDate)} ~ ${formatShortDate(endDate)}`
}

export function todayIso() {
  return localDateIso(new Date())
}

export function addLocalDaysIso(days, from = new Date()) {
  const target = new Date(from)
  target.setDate(target.getDate() + days)
  return localDateIso(target)
}

function localDateIso(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
