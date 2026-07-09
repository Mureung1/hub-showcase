export function getConfirmedCount(meeting) {
  return meeting.participants.filter((p) => p.status === 'confirmed' || p.status === 'approved').length
}

export function getMyParticipation(meeting, userId) {
  return meeting.participants.find((p) => p.userId === userId) ?? null
}

export function getPendingApplicants(meeting) {
  return meeting.participants.filter((p) => p.status === 'pending')
}

// 기획서 11번 "지난 모임 노출" — 종료/취소된 모임은 목록·검색에서 자동 제외
export function isListedByDefault(meeting) {
  return meeting.status !== 'finished' && meeting.status !== 'cancelled'
}
