// Vercel Rewrite를 사용하여 /api 요청을 Backend로 전달
// 개발 환경에서는 vite.config.js의 proxy 사용
// 배포 환경에서는 vercel.json의 rewrites 사용

export async function getTestMessage() {
  const response = await fetch("/api/test");

  if (!response.ok) {
    throw new Error("백엔드 요청에 실패했습니다.");
  }

  return response.json();
}