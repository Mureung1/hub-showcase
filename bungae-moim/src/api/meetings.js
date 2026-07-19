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
