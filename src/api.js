async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message || payload.error || "API 요청 중 오류가 발생했습니다.";
    throw new Error(message);
  }

  return payload;
}

export async function getHealth() {
  const response = await fetch("/api/health", {
    headers: {
      Accept: "application/json",
    },
  });

  return readJsonResponse(response);
}

export async function analyzeOpportunity(payload) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readJsonResponse(response);
}
