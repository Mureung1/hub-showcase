import axios from 'axios';

// 모든 API 호출은 이 인스턴스를 통해서. 로그인 후 토큰은 인터셉터로 자동 첨부.
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
