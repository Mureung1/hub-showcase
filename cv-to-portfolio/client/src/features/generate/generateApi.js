export async function requestAiPortfolio({
  cvMarkdown,
  designMarkdown,
  targetMarkdown,
  signal,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cvMarkdown, designMarkdown, targetMarkdown }),
    signal,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // 아래의 공통 오류 메시지로 변환한다.
  }

  if (!response.ok) {
    if (response.status === 400 && data?.error) {
      throw new Error(data.error);
    }
    if (response.status === 503) {
      throw new Error("AI API가 구성되지 않았습니다.");
    }
    throw new Error("AI 생성 서버가 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (typeof data?.html !== "string" || data.html.trim().length === 0) {
    throw new Error("AI 생성 응답에 HTML이 없습니다.");
  }

  return data.html;
}
