import { getToken } from "../utils/auth";

// Vercel Rewrite를 사용하여 /api 요청을 Backend로 전달

export async function createNotice(title, content) {
  const token = getToken();

  const response = await fetch("/api/notices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      content,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "공지 저장 실패");
  }

  return data;
}

export async function uploadPDF(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/notices/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "PDF 업로드 실패");
  }

  return data;
}
