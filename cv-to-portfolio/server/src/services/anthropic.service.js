import { config, isAiConfigured } from "../config/env.js";
import { ServiceError } from "../errors/ServiceError.js";

// 지원 목표 + CV 원문 + 선택한 DESIGN.md 를 LLM에 넘겨 "독립 실행형 HTML" 하나를 생성한다.
// (클라이언트의 generateWithAI.js seam 을 서버로 옮긴 것 — API 키가 서버에만 있게 된다.)
export function buildPortfolioPrompt({
  cvMarkdown,
  designMarkdown,
  targetMarkdown,
}) {
  return [
    "너는 채용 포트폴리오를 만드는 프론트엔드 개발자다.",
    "지원 목표와 이력서(CV)를 분석해 DESIGN.md 지침에 맞는 완성된 독립 실행형 HTML 포트폴리오 하나를 만들어라.",
    "- 지원 기업의 인재상과 JD에 관련된 실제 경험을 앞에 배치하고 구체적인 근거가 잘 보이게 표현한다.",
    "- CV에 없는 경력, 수치, 기술, 성과를 절대 만들지 않는다. 근거가 없으면 생략한다.",
    "- JD 문구를 그대로 복사하지 말고 CV의 사실을 지원 직무 관점에서 재구성한다.",
    "- 외부 CSS 프레임워크 없이 <style>의 인라인 CSS만 사용한다.",
    "- DESIGN.md의 팔레트, 타이포, 레이아웃을 충실히 반영한다.",
    "- 설명 없이 완결된 <!doctype html> 문서만 출력한다.",
    "",
    "=== 지원 목표와 JD 요약 ===",
    targetMarkdown,
    "",
    "=== CV ===",
    cvMarkdown,
    "",
    "=== DESIGN.md ===",
    designMarkdown,
  ].join("\n");
}

export async function generatePortfolioHtml({
  cvMarkdown,
  designMarkdown,
  targetMarkdown,
}) {
  if (!isAiConfigured()) {
    throw new ServiceError(
      "AI 생성이 아직 구성되지 않았습니다. server/.env 에 ANTHROPIC_API_KEY 를 설정하세요.",
      503,
    );
  }

  const prompt = buildPortfolioPrompt({
    cvMarkdown,
    designMarkdown,
    targetMarkdown,
  });

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
