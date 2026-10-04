import axios from 'axios';

// API 설정 (백엔드 정책 서버)
const api = axios.create({ baseURL: 'http://localhost:3000/api' });

// 토큰 자동 주입 인터셉터
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → 자동 로그아웃
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export default api;
