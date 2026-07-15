import { getToken } from "../utils/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function createNotice(title, content) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/api/notices`, {
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

  const response = await fetch(`${API_BASE_URL}/api/notices/upload`, {
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
