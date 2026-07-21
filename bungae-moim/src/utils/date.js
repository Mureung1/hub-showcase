const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateTime(iso) {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const date = d.getDate()
  const weekday = WEEKDAYS[d.getDay()]
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}월 ${date}일(${weekday}) ${hours}:${minutes}`
}

function formatDateOnly(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export function formatMeetingSchedule(meeting) {
  if (meeting.type === 'flash') {
    return formatDateTime(meeting.startAt)
  }
  return `${formatDateOnly(meeting.startAt)} ~ ${formatDateOnly(meeting.endAt)}`
}
