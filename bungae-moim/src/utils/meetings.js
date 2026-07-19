// 서버 목록 응답에는 participants가 없다(참여 기능은 이번 주 범위 밖). 그 경우 0명으로 센다.
export function getConfirmedCount(meeting) {
  return (meeting.participants ?? []).filter((p) => p.status === 'confirmed' || p.status === 'approved').length
}

export function getPendingApplicants(meeting) {
  return (meeting.participants ?? []).filter((p) => p.status === 'pending')
}
