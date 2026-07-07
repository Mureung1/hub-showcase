// ============================================================
//  [SEAM] 실서비스용 AI 생성 경로 — 프로토타입에서는 호출하지 않음
//
//  프로토타입은 generatePortfolio()의 "결정적 렌더러"로 HTML을 만든다.
//  실제 서비스에서는 아래처럼 CV 원문 + 선택한 DESIGN.md를 통째로
//  LLM에 넘겨 자유도 높은 HTML을 생성하도록 교체하면 된다.
//  (사용자 시나리오 3단계 "AI가 작성하도록 요청한다"의 실제 구현부)
//
//  ⚠️ API 키를 브라우저에 노출하면 안 된다. 이 함수는 반드시
//     백엔드(서버 / 서버리스 함수)에서 호출해야 한다.
// ============================================================

export async function generatePortfolioWithAI({
  cvMarkdown,
  designMarkdown,
  apiKey,
  model = "claude-sonnet-5", // 예: "claude-sonnet-5" | "claude-opus-4-8"
}) {
  const prompt = [
    "너는 프론트엔드 개발자다. 아래 이력서(CV)를 아래 DESIGN.md 지침에 맞춰",
    "완성된 '독립 실행형 HTML 포트폴리오 페이지' 하나로 만들어라.",
    "- 외부 CSS 프레임워크 없이 <style>의 인라인 CSS만 사용",
    "- DESIGN.md의 팔레트/타이포/레이아웃을 충실히 반영",
    "- 설명 없이 완결된 <!doctype html> 문서만 출력",
    "",
    "=== CV ===",
    cvMarkdown,
    "",
    "=== DESIGN.md ===",
    designMarkdown,
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey, // 서버 환경변수에서 주입 (절대 하드코딩/노출 금지)
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  // 응답의 text 블록들을 이어붙여 HTML 문자열로 반환
  return (data.content || []).map((b) => b.text || "").join("");
}
