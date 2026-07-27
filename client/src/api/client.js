import axios from 'axios'
import { getSession } from '../lib/session.js'

/*
 * API 주소.
 *
 * 로컬: 값을 비워두면 상대경로 '/api' — vite proxy가 서버(4000)로 전달한다.
 * 배포: VITE_API_BASE_URL에 서버 오리진을 넣는다(예: https://hub-api.onrender.com).
 *       Vercel은 정적 호스팅이라 프록시가 없어, 이 값이 없으면 /api가 404가 된다.
 *
 * 관련: client/vercel.json의 rewrite는 `/((?!api/).*)` 로 /api를 제외해야 한다.
 * `/(.*)` 로 넓히면 API 호출에 index.html이 200으로 반환되고, 앱이 JSON 대신 HTML을
 * 받아 .map()에서 죽는다(흰 화면). JSON에는 주석을 달 수 없어 여기 남긴다.
 */
const origin = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')

const api = axios.create({
  baseURL: origin ? `${origin}/api` : '/api',
})

// 로그인 전까지 임시 사용자 식별: 세션의 userId를 X-User-Id 헤더로 전달 (T-03).
// 로그인(C1) 구현 시 Authorization 토큰으로 교체한다.
api.interceptors.request.use((config) => {
  const session = getSession()
  if (session?.userId != null) {
    config.headers['X-User-Id'] = session.userId
  }
  return config
})

export default api
