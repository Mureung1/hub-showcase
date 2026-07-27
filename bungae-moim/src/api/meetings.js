// 모임 등록/조회 API(POST /api/meetings, GET /api/meetings)를 다루는 모듈.
// 화면 컴포넌트는 이 파일의 함수만 부르고, 쿼리스트링 조립은 여기에만 둔다.

import { request } from './client.js'

// GET /api/meetings — 필터를 쿼리스트링으로 조립해 목록을 받아온다.
// 빈 값/undefined는 서버에 보내지 않는다(서버는 값이 있으면 정확일치 필터, 키워드는 부분검색).
// 반환: { items, page, totalPages, total }. 페이지네이션은 이번 주 화면에선 쓰지 않지만
// 시그니처는 열어둔다(filters.page 지원). total은 필터 조건에 맞는 전체 건수로,
// 응답 items가 페이지 크기(20)로 잘려도 정확한 총 개수를 보여줘야 할 때 쓴다.
export function fetchMeetings(filters = {}) {
  const params = new URLSearchParams()

  const add = (key, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, value)
    }
  }

  add('type', filters.type)
  add('category', filters.category)
  add('regionSido', filters.regionSido)
  add('regionSigungu', filters.regionSigungu)
  add('keyword', filters.keyword)
  add('status', filters.status)
  add('page', filters.page)
  add('sort', filters.sort)

  const qs = params.toString()
  return request(`/api/meetings${qs ? `?${qs}` : ''}`)
}

// POST /api/meetings — 모임 등록(로그인 필요). 성공 시 생성된 모임 객체를 반환한다.
export function createMeeting(input) {
  return request('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

// GET /api/meetings/:id — 상세 조회.
// 응답은 로그인 상태에 따라 달라진다(myParticipation, openChatUrl). 그래서 화면에서는
// 로그인 부트스트랩이 끝난 뒤에 호출해야 한다.
export function fetchMeeting(id) {
  return request(`/api/meetings/${encodeURIComponent(id)}`)
}

// POST /api/meetings/:id/apply — 참여 신청(F1). 성공 시 { status } 반환.
// answer는 가입 질문이 설정된 소모임에서만 필요하다. 바디를 보낼 때는 Content-Type이
// 반드시 있어야 서버의 express.json()이 파싱한다(없으면 req.body가 {}가 된다).
export function applyToMeeting(id, answer) {
  const hasAnswer = typeof answer === 'string' && answer.trim() !== ''
  return request(`/api/meetings/${encodeURIComponent(id)}/apply`, {
    method: 'POST',
    ...(hasAnswer
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: answer.trim() }),
        }
      : {}),
  })
}

// DELETE /api/meetings/:id/apply — 참여/신청 취소(F2). 성공 시 { status: 'cancelled' } 반환.
export function cancelParticipation(id) {
  return request(`/api/meetings/${encodeURIComponent(id)}/apply`, { method: 'DELETE' })
}

// GET /api/meetings/:id/participants — 신청자 목록(F3, 모임장만). { items } 반환.
export function fetchParticipants(id) {
  return request(`/api/meetings/${encodeURIComponent(id)}/participants`)
}

// PATCH /api/meetings/:id/participants/:userId — 승인/거절(F4). { userId, status } 반환.
// 위의 applyToMeeting/cancelParticipation은 바디가 없어 헤더를 안 붙이지만, 이건 JSON 바디를
// 보내므로 Content-Type이 반드시 있어야 한다. 없으면 서버의 express.json()이 본문을 파싱하지
// 않아 req.body가 {}가 되고, 원인을 알기 어려운 VALIDATION_ERROR로 나타난다.
export function respondToApplicant(id, userId, status) {
  return request(
    `/api/meetings/${encodeURIComponent(id)}/participants/${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }
  )
}

// DELETE /api/meetings/:id — 모임 취소(E5, 모임장만). 성공 시 { status: 'cancelled' } 반환.
export function deleteMeeting(id) {
  return request(`/api/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// PATCH /api/meetings/:id — 모임 수정(E4, 모임장만). 성공 시 수정된 모임 객체 반환.
export function updateMeeting(id, input) {
  return request(`/api/meetings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
