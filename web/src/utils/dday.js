// deadline: 문자열(DB 값). 함수 안에서 파싱. 빈 값/Invalid면 null.
// today: Date 객체. new Date()로 만들어 넘길 것 — toISOString() 왕복 금지
//   (UTC 변환이 한국 새벽에 날짜를 하루 밀리게 하는 원인).
export function calculateDday(deadline, today) {
  const deadlineDate = new Date(deadline)
  if (!deadline || isNaN(deadlineDate.getTime())) return null

  const deadlineDay = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate(),
  )
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const diffDays = Math.round((deadlineDay - todayDay) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return `오늘 ${deadlineDate.getHours()}시 마감`
  if (diffDays < 0) return '마감 지남'
  return `D-${diffDays}`
}
