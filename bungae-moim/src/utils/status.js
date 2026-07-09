// DB 스키마 설계서의 meetings.status / meeting_participants.status enum과 매핑

export const MEETING_STATUS_META = {
  recruiting: { label: '모집중', tone: 'positive' },
  closed: { label: '마감', tone: 'warning' },
  finished: { label: '종료된 모임', tone: 'muted' },
  cancelled: { label: '취소됨', tone: 'muted' },
}

export const PARTICIPATION_STATUS_META = {
  confirmed: { label: '참여 확정', tone: 'positive' },
  pending: { label: '승인 대기', tone: 'warning' },
  approved: { label: '승인됨', tone: 'positive' },
  rejected: { label: '거절됨', tone: 'muted' },
  cancelled: { label: '취소됨', tone: 'muted' },
}

export function meetingStatusMeta(status) {
  return MEETING_STATUS_META[status] ?? { label: status, tone: 'muted' }
}

export function participationStatusMeta(status) {
  return PARTICIPATION_STATUS_META[status] ?? { label: status, tone: 'muted' }
}
