import api from '../api/client.js'

/*
 * 세션 (T-03) — 로그인 미구현 단계의 임시 사용자 식별.
 * 역할 선택 시 시딩 사용자(seed.js)를 자동 매핑해 localStorage에 저장한다.
 * 로그인(C1) 구현 시 이 파일의 매핑을 실제 인증 결과로 교체한다.
 */

// seed.js의 삽입 순서 기준 id (RESTART IDENTITY라 항상 동일).
// owner4@hub.test = 6 (가게 미등록 신규 사장 — W1 등록 흐름을 태우기 위함), consumer1@hub.test = 4
const DEMO_USER_BY_ROLE = {
  owner: { userId: 6, nickname: '신규사장' },
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

/*
 * 시연용 소비자 계정 배정 (부스 대응).
 *
 * 방문자마다 다른 계정을 받아야 예약·알림이 서로 섞이지 않는다.
 * 브라우저는 다른 사람이 뭘 가져갔는지 알 수 없으므로 서버가 순서대로 배정한다.
 * 한 번 받은 계정은 localStorage에 남아 재방문 시 그대로 유지된다.
 *
 * 배정에 실패해도(서버 절전·네트워크) 시연이 멈추면 안 되므로 공용 계정으로 넘어간다.
 */
export async function startConsumerSession() {
  const existing = getSession()
  if (existing?.role === 'consumer') return existing

  try {
    const { data } = await api.post('/demo/consumer')
    const session = { role: 'consumer', userId: data.userId, nickname: data.nickname }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    return session
  } catch {
    return selectRole('consumer')
  }
}
