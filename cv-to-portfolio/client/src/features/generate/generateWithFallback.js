import { generatePortfolio } from "./generatePortfolio.js";
import { requestAiPortfolio } from "./generateApi.js";
import { buildTargetMarkdown } from "../jobTarget/jobPostings.js";

export async function generateWithFallback({
  cv,
  cvMarkdown,
  theme,
  jobTarget,
  signal,
  request = requestAiPortfolio,
}) {
  try {
    const targetMarkdown = buildTargetMarkdown(jobTarget);
    const html = await request({
      cvMarkdown,
      designMarkdown: theme.markdown,
      targetMarkdown,
      signal,
    });
    return {
      html,
      source: "ai",
      notice: `${jobTarget.company} ${jobTarget.role} 공고에 맞춰 AI가 생성한 결과입니다.`,
    };
  } catch (error) {
    if (error.name === "AbortError") throw error;

    return {
      html: generatePortfolio(cv, theme, jobTarget),
      source: "fallback",
      notice: `AI 생성에 실패해 로컬 렌더러로 완성했습니다. JD 정보는 표시되지만 문장 재구성은 제한됩니다. (${error.message})`,
    };
  }
}
