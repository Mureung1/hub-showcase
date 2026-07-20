import { formatDateLabel } from './formatDateLabel.ts'

// claude: 관리자/참여자 대시보드 상단에 기한(날짜+시간 범위)을 "7/1(화) ~ 7/24(목) · 01:30~04:30" 형태로 보여주기 위한 순수 포맷 함수.
export function formatAppointmentPeriod(
  dateStart: string,
  dateEnd: string,
  timeStart: string,
  timeEnd: string,
): string {
  const start = formatDateLabel(dateStart)
  const end = formatDateLabel(dateEnd)
  const datePart = start === end ? start : `${start} ~ ${end}`

  return `${datePart} · ${timeStart}~${timeEnd}`
}
