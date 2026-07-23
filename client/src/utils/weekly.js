function getWeekStart(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0=일요일
  const diffToMonday = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diffToMonday)
  return d
}

export function filterCheckinsInWeek(checkins, referenceDate) {
  const weekStart = getWeekStart(new Date(referenceDate))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return checkins.filter((checkin) => {
    const created = new Date(checkin.createdAt)
    return created >= weekStart && created < weekEnd
  })
}
