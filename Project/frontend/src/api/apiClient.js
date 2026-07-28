import axios from 'axios';

const apiClient = axios.create({
  // Empty in local development: Vite proxies requests to the API server.
  // Set VITE_API_BASE_URL to the deployed API origin in production.
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally (e.g. 401 token expiration)
apiClient.interceptors.response.use(
  (response) => {
    // Standardize return format to match backend { success, data, error }
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user info on auth failure
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      
      // Optionally trigger reload or redirect
      console.warn('Authentication token expired or invalid. Credentials cleared.');
    }
    
    // Extract and return unified error payload
    const apiError = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || '서버와의 통신 도중 에러가 발생했습니다.',
    };
    
    return Promise.reject(apiError);
  }
);

export default apiClient;
