export function formatShortDate(date) {
  if (!date) return '미정'
  const [, month = '', day = ''] = date.split('-')
  return month && day ? `${month}.${day}` : '미정'
}

export function formatPeriod(startDate, endDate) {
  if (!startDate || !endDate) return '미정'
  return `${formatShortDate(startDate)} ~ ${formatShortDate(endDate)}`
}

export function todayIso() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
