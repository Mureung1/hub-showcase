import axios from 'axios'

// 개발 환경에서는 vite proxy가 /api를 서버(4000)로 전달한다.
const api = axios.create({
  baseURL: '/api',
})

export default api
