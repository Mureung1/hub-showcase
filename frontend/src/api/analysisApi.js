import { getToken } from "../utils/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function analyzeNotice(text) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/api/notices/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "분석 실패");
  }

  return data;
}

export async function saveEvents(events) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ events }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "일정 저장 실패");
  }

  return data;
}
