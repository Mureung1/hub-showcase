// F3(GET /api/meetings/:id/participants)가 준 신청자 배열을 화면용으로 가공한다.
// "어떤 상태가 집계 대상인가"라는 규칙을 화면 JSX가 아니라 여기 한 곳에 모아둔다.

export function getPendingApplicants(participants) {
  return (participants ?? []).filter((p) => p.status === 'pending')
}

// 카드 상단 "신청자 N명"의 N. 목록에는 취소·거절한 사람도 남지만 집계에서는 뺀다 —
// 모임장이 알고 싶은 건 지금 이 모임에 관여 중인 사람 수이기 때문이다.
export function countActiveApplicants(participants) {
  return (participants ?? []).filter((p) => p.status === 'pending' || p.status === 'approved').length
}
