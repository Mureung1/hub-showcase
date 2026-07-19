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

// 기획서 6.1 — 생년월일로 성인/미성년 판별 (만 19세 기준).
// 생년월일이 없거나 형식이 잘못되면 '미성년'이 아니라 '판별 불가'(null)를 반환한다.
// 백로그 확정사항대로 판별 불가 계정도 성인 전용 모임에는 신청할 수 없는데, 둘을 섞으면
// 안내 문구를 구분할 수 없다. 서버 측 isAdult(src/utils/age.js)와 같은 규약이다.
export function isAdultBirthDate(birthDateIso, today = new Date()) {
  if (!birthDateIso) return null

  const birth = new Date(birthDateIso)
  if (Number.isNaN(birth.getTime())) return null

  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1

  return age >= 19
}

export function formatMeetingSchedule(meeting) {
  if (meeting.type === 'flash') {
    return formatDateTime(meeting.startAt)
  }
  return `${formatDateOnly(meeting.startAt)} ~ ${formatDateOnly(meeting.endAt)}`
}
