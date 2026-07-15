/*
 * 세션 (T-03) — 로그인 미구현 단계의 임시 사용자 식별.
 * 역할 선택 시 시딩 사용자(seed.js)를 자동 매핑해 localStorage에 저장한다.
 * 로그인(C1) 구현 시 이 파일의 매핑을 실제 인증 결과로 교체한다.
 */

// seed.js의 삽입 순서 기준 id (RESTART IDENTITY라 항상 동일).
// owner1@hub.test = 1, consumer1@hub.test = 4
const DEMO_USER_BY_ROLE = {
  owner: { userId: 1, nickname: '베이커리사장' },
  consumer: { userId: 4, nickname: '규현' },
}

const STORAGE_KEY = 'hub.session'

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function selectRole(role) {
  const demo = DEMO_USER_BY_ROLE[role]
  if (!demo) throw new Error(`알 수 없는 역할: ${role}`)
  const session = { role, ...demo }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}
