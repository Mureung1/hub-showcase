import axios from 'axios';

import { clearAccessToken, getAccessToken } from '../utils/authStorage';

export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
});

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const networkError = new Error(
        '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
      );
      networkError.code = 'NETWORK_ERROR';
      networkError.details = {};
      networkError.status = null;

      return Promise.reject(networkError);
    }

    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response.status === 401 && !isLoginRequest) {
      clearAccessToken();
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }

    const serverError = error.response?.data?.error;
    const apiError = new Error(
      serverError?.message || error.message || '요청 처리 중 오류가 발생했습니다.',
    );

    apiError.code = serverError?.code;
    apiError.details = serverError?.details ?? {};
    apiError.status = error.response?.status;

    return Promise.reject(apiError);
  },
);

export default httpClient;
