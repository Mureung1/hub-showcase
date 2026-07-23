// 참여자 응답 완료/대기 판별.
// GET /api/letters/:token/responses는 participants.responses를 단일 객체 또는 null로 반환한다
// (Supabase가 participants↔responses 관계를 1:1로 추론하기 때문에 배열이 아니다).
// 과거 이 값을 배열로 가정(예: `.length` 체크)해서 응답을 했는데도 "응답 대기"로
// 잘못 표시된 버그가 있었다 — null 여부만으로 판별해야 한다.
export function isResponded(participant) {
  return participant.responses != null
}

export function countResponded(participants) {
  return participants.filter(isResponded).length
}

export function getSelectedSlotIds(participant) {
  return participant.responses?.selected_slot_ids ?? []
}
