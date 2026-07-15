import axios from 'axios'
import { getSession } from '../lib/session.js'

// 개발 환경에서는 vite proxy가 /api를 서버(4000)로 전달한다.
const api = axios.create({
  baseURL: '/api',
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
