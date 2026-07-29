// FR-21 — 비밀번호 찾기(보안 질문 방식)의 순수 로직. client(가입 폼/찾기 폼)와 server(검증) 양쪽이
// import하므로 storage/fetch 의존이 전혀 없다 — authId.js의 validate* 규약(유효하면 null, 아니면
// 인라인 에러 문구)을 그대로 따른다.
export const SECURITY_QUESTIONS = [
  { id: 'childhood-nickname', question: '어릴 적 별명은 무엇이었나요?' },
  { id: 'first-pet', question: '처음 키운 반려동물의 이름은?' },
  { id: 'birth-city', question: '태어난 도시(또는 고향)는 어디인가요?' },
  { id: 'favorite-food', question: '가장 좋아하는 음식은 무엇인가요?' },
  { id: 'elementary-school', question: '다닌 초등학교 이름은?' },
]

const QUESTION_IDS = new Set(SECURITY_QUESTIONS.map((q) => q.id))
const ANSWER_MAX_LENGTH = 30

export function findSecurityQuestion(questionId) {
  return SECURITY_QUESTIONS.find((q) => q.id === questionId) ?? null
}

export function validateQuestionId(questionId) {
  if (!questionId) return '보안 질문을 선택해주세요.'
  if (!QUESTION_IDS.has(questionId)) return '올바른 보안 질문을 선택해주세요.'
  return null
}

export function validateSecurityAnswer(answer) {
  const trimmed = String(answer ?? '').trim()
  if (!trimmed) return '답변을 입력해주세요.'
  if (trimmed.length > ANSWER_MAX_LENGTH) return `답변은 ${ANSWER_MAX_LENGTH}자 이하로 입력해주세요.`
  return null
}

// 대소문자·앞뒤/중간 공백 차이로 인한 오탈자성 실패를 완화한다 — 해시 저장 전/검증 전 항상 이 함수를
// 거쳐야 한다(server/auth/securityAnswer.js는 정규화를 하지 않고 이미 정규화된 값을 받는다는 계약).
export function normalizeSecurityAnswer(answer) {
  return String(answer ?? '').trim().toLowerCase().replace(/\s+/g, '')
}
