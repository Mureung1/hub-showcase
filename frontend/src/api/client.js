import axios from 'axios';

// 모든 API 요청의 공통 axios 인스턴스.
// baseURL '/api' 는 vite dev proxy(→ http://localhost:8080)를 통해 백엔드로 전달된다.
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export default apiClient;
