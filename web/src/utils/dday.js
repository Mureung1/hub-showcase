export function calculateDday(deadline, today) {
  if (!deadline) return null

  const deadlineDate = new Date(deadline)
  const todayDate = new Date(today)

  const deadlineDay = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate(),
  )
  const todayDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())

  const diffDays = Math.round((deadlineDay - todayDay) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return `오늘 ${deadlineDate.getHours()}시 마감`
  if (diffDays < 0) return '마감 지남'
  return `D-${diffDays}`
}
