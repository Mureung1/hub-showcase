import { generatePortfolio } from "./generatePortfolio.js";
import { requestAiPortfolio } from "./generateApi.js";

export async function generateWithFallback({
  cv,
  cvMarkdown,
  theme,
  signal,
  request = requestAiPortfolio,
}) {
  try {
    const html = await request({
      cvMarkdown,
      designMarkdown: theme.markdown,
      signal,
    });
    return {
      html,
      source: "ai",
      notice: "서버 AI API가 생성한 결과입니다.",
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;

    return {
      html: generatePortfolio(cv, theme),
      source: "fallback",
      notice: `AI 생성에 실패해 로컬 렌더러로 완성했습니다. (${error.message})`,
    };
  }
}
