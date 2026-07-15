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
