import { config, isAiConfigured } from "../config/env.js";

// 서비스 계층에서 던지는 도메인 에러 — 컨트롤러/에러 핸들러가 상태코드로 변환한다.
export class ServiceError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}

// CV 원문 + 선택한 DESIGN.md 를 그대로 LLM에 넘겨 "독립 실행형 HTML" 하나를 생성한다.
// (클라이언트의 generateWithAI.js seam 을 서버로 옮긴 것 — API 키가 서버에만 있게 된다.)
export async function generatePortfolioHtml({ cvMarkdown, designMarkdown }) {
  if (!isAiConfigured()) {
    throw new ServiceError(
      "AI 생성이 아직 구성되지 않았습니다. server/.env 에 ANTHROPIC_API_KEY 를 설정하세요.",
      503,
    );
  }

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
      "x-api-key": config.anthropic.apiKey, // 서버 환경변수에서만 주입
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new ServiceError(`Anthropic API error: ${res.status} ${detail}`, 502);
  }

  const data = await res.json();
  const html = (data.content || []).map((b) => b.text || "").join("");
  return html;
}
