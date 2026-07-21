// 사용자 정보 API. 생년월일 최초 입력(PATCH /api/users/me)을 담당한다.
import { request } from './client.js'

// PATCH /api/users/me — 생년월일 최초 입력(D5). 성공 시 갱신된 사용자 객체를 반환한다.
export function updateMe(birthDate) {
  return request('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birthDate }),
  })
}
