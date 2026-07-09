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

// 기획서 6.1 — 생년월일로 성인/미성년 여부 판별 (만 19세 기준, 오늘 = 2026-07-09 가정)
export function isAdultBirthDate(birthDateIso, todayIso = '2026-07-09') {
  const birth = new Date(birthDateIso)
  const today = new Date(todayIso)
  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age >= 19
}

export function formatMeetingSchedule(meeting) {
  if (meeting.type === 'flash') {
    return formatDateTime(meeting.startAt)
  }
  return `${formatDateOnly(meeting.startAt)} ~ ${formatDateOnly(meeting.endAt)}`
}
