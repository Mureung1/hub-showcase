// 상세 응답의 participants(모임장 신청자 목록, F3에서 제공)에서 대기 중 신청자를 추린다.
// 아직 participants가 없으면 빈 배열로 안전하게 동작한다.
export function getPendingApplicants(meeting) {
  return (meeting.participants ?? []).filter((p) => p.status === 'pending')
}
