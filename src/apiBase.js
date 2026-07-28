// 배포 환경에서는 Vercel에 VITE_API_BASE_URL 환경변수로 Render 주소를 넣어준다.
// 로컬 개발 중엔 값이 없으니 localhost:4000으로 그대로 동작한다.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
