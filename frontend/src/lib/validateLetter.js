// 편지 본문 검증 — 공백만 있는 본문을 막고, 5000자 상한은 서버(letterSchema)와 동일하게
// trim하지 않은 원문 길이 기준으로 검사한다 (프론트가 trim 길이로 통과시키면 서버에서만
// 거절당해 원인 모를 전송 실패로 이어지는 것을 막기 위함).
export const MAX_LETTER_LENGTH = 5000

export function validateLetterContent(text) {
  return text.trim().length > 0 && text.length <= MAX_LETTER_LENGTH
}
