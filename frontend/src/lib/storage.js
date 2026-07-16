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

export function getPublishedDocument(id) {
  return request(`/documents/${id}`)
}

// 신규(id 없음)면 생성, 있으면 수정. 서버가 발급한 uuid를 가진 저장 결과를 반환한다.
export function saveDraft(draft) {
  const body = { ...draft, status: 'draft' }
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
