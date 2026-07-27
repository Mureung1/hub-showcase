import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// 로그인 토큰이 있으면 모든 요청에 자동으로 붙여줌
// authStore가 persist 미들웨어로 localStorage와 동기화되므로, 컴포넌트 밖(모듈 스코프)에서도
// useAuthStore.getState()로 최신 token 값을 바로 읽을 수 있다.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
