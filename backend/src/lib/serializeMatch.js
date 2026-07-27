// Match를 클라이언트 응답 형태로 바꾸는 유일한 통로.
// authorId 등 작성자를 역추적할 수 있는 필드는 절대 포함하지 않는다 — 익명 서비스의 핵심 원칙.
// (matchesService의 쿼리들도 select로 authorId를 애초에 안 가져오지만, 이 함수가 응답 형태를
// 만드는 마지막 관문이라 여기서도 명시적으로 화이트리스트만 뽑는다 — 방어를 이중으로 둔다.)
export function serializeMatch(match) {
  return {
    has_match: true,
    match_id: match.id,
    matched_letter: {
      id: match.matchedLetter.id,
      body: match.matchedLetter.content,
      created_at: match.matchedLetter.createdAt,
    },
    reason: match.reason,
    expires_at: match.expiresAt,
  }
}
