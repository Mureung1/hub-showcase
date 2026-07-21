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

// 서버 blockReason을 참여 카드에 보여줄 안내 문구로 바꾼다. LOGIN_REQUIRED/HOST/ALREADY_APPLIED는
// 별도 UI(로그인 카드/모임장 카드/참여중 분기)가 처리하므로 여기 문구는 그 외 사유에만 쓰인다.
const BLOCK_REASON_LABEL = {
  REJECTED: '아쉽지만 이번 신청은 거절됐어요.',
  CANCELLED_MEETING: '모임장이 취소한 모임이에요.',
  ENDED: '이미 종료된 모임이에요.',
  FULL: '정원이 가득 찼어요.',
  BIRTHDATE_REQUIRED: '생년월일을 등록해야 참여할 수 있어요.',
  ADULT_ONLY: '성인만 참여할 수 있는 모임이에요.',
}

export function blockReasonLabel(reason) {
  return BLOCK_REASON_LABEL[reason] ?? '지금은 신청할 수 없어요.'
}
