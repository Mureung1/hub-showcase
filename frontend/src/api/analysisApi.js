import { getToken } from "../utils/auth";

// Vercel Rewrite를 사용하여 /api 요청을 Backend로 전달

export async function analyzeNotice(text) {
  const token = getToken();

  const response = await fetch("/api/notices/analyze", {
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

  const response = await fetch("/api/events", {
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

export async function getEvents() {
  const token = getToken();

  const response = await fetch("/api/events", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "일정 조회 실패");
  }

  return data;
}

export async function checkDuplicate(events) {
  const token = getToken();

  const response = await fetch("/api/events/check-duplicate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ events }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "중복 검사 실패");
  }

  return data;
}

export async function updateEvent(eventId, eventData) {
  const token = getToken();

  const response = await fetch("/api/events/" + eventId, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "일정 수정 실패");
  }

  return data;
}

export async function deleteEvent(eventId) {
  const token = getToken();

  const response = await fetch("/api/events/" + eventId, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "일정 삭제 실패");
  }

  return data;
}
