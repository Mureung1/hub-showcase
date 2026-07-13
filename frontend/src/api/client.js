const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getTestMessage() {
  const response = await fetch(`${API_BASE_URL}/api/test`);

  if (!response.ok) {
    throw new Error("백엔드 요청에 실패했습니다.");
  }

  return response.json();
}