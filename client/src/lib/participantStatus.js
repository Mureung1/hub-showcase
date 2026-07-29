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

export function getSelectedLocationIds(participant) {
  return participant.responses?.selected_location_ids ?? []
}

// 후보 id별 득표 수 집계. getIds는 참여자 1명이 선택한 후보 id 배열을 반환하는 함수
// (getSelectedSlotIds 또는 getSelectedLocationIds).
export function tallyVotes(participants, candidateIds, getIds) {
  const counts = {}
  for (const id of candidateIds) counts[id] = 0
  for (const participant of participants) {
    for (const id of getIds(participant)) {
      if (id in counts) counts[id] += 1
    }
  }
  return counts
}
