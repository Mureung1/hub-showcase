// 문서 초안/발행 데이터 접근. backend REST API(= Supabase documents 테이블)를 탄다.
// 이전에는 localStorage였고, 화면 코드가 그대로 동작하도록 export 이름·인자는 유지한 채
// 전부 async(Promise 반환)로 바꿨다. 연동 교체 지점은 여전히 이 파일 하나다(docs/data-model.md).

import { request } from './api.js'

export function loadDrafts() {
  return request('/documents?status=draft')
}

export function loadPublished() {
  return request('/documents?status=published')
}

// 로그인 사용자의 문서만(마이페이지용). 토큰은 api.js가 자동으로 붙인다.
export function loadMyDrafts() {
  return request('/documents?status=draft&mine=true')
}

export function loadMyPublished() {
  return request('/documents?status=published&mine=true')
}

// 발행 문서는 누구나, 초안은 소유자(회원) 또는 수정 비밀번호(비회원)만 열람 가능하다.
// 비회원 초안을 이어쓸 때는 editPassword를 넘겨야 서버가 열어준다.
export function getPublishedDocument(id, { editPassword } = {}) {
  return request(`/documents/${id}`, {
    headers: editPassword ? { 'x-edit-password': editPassword } : undefined,
  })
}

// 신규(id 없음)면 생성, 있으면 수정. 서버가 발급한 uuid를 가진 저장 결과를 반환한다.
// 이미 발행한 문서를 고치는 중이면 status를 'published'로 넘겨야 한다 —
// 기본값으로 'draft'를 덮어쓰면 자동저장 한 번에 문서가 조용히 발행 취소된다.
export function saveDraft(draft) {
  const body = { ...draft, status: draft.status ?? 'draft' }
  if (draft.id) {
    return request(`/documents/${draft.id}`, { method: 'PATCH', body })
  }
  return request('/documents', { method: 'POST', body })
}

export function deleteDraft(id) {
  return request(`/documents/${id}`, { method: 'DELETE' })
}

// 초안(id 있음)을 발행하면 같은 row의 status를 flip, 신규면 바로 published로 생성.
// 발행된 문서를 반환한다.
export function publishDocument(doc) {
  const body = { ...doc, status: 'published' }
  if (doc.id) {
    return request(`/documents/${doc.id}`, { method: 'PATCH', body })
  }
  return request('/documents', { method: 'POST', body })
}

// 생성된 코멘트(서버가 uuid·createdAt 부여)를 반환한다.
export function addCommentToPublished(docId, comment) {
  return request(`/documents/${docId}/comments`, { method: 'POST', body: comment })
}

// 회원 전용: 제출 직후 AI 자동 피드백 요청(섹션별 + 전체 총평).
// payload로 문서 메타(title/gameTag/templateName)와 섹션별 guide를 함께 보내야
// 백엔드가 섹션 성격에 맞는 특화 피드백을 낸다. 백엔드가 LLM 호출 후 comments 에 append 한다.
export function requestAiFeedback(docId, payload = {}) {
  return request(`/documents/${docId}/ai-feedback`, { method: 'POST', body: payload })
}

// 회원 전용: 발행 전 에디터 미리보기. 저장하지 않고 [{sectionKey, content}] 배열을 돌려준다.
export function requestAiFeedbackPreview(payload = {}) {
  return request('/documents/ai-feedback/preview', { method: 'POST', body: payload })
}

// 좋아요/북마크 — 카운트 + 내 반응 여부 조회.
export function getReactions(docId) {
  return request(`/documents/${docId}/reactions`)
}

// 회원 전용 토글(있으면 취소, 없으면 추가). type: 'like' | 'bookmark'
export function toggleReaction(docId, type) {
  return request(`/documents/${docId}/reactions`, { method: 'POST', body: { type } })
}

// 비회원 문서 수정 비밀번호 확인(잠금 해제 모달용).
export function verifyEditPassword(docId, editPassword) {
  return request(`/documents/${docId}/verify-edit`, { method: 'POST', body: { editPassword } })
}
