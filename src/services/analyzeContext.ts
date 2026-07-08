import { sampleAnalysis } from "../data/sampleAnalysis";
import type { ContextAnalysisResult } from "../types/context";

export async function analyzeContext(
  projectTitle: string,
  inputText: string,
): Promise<ContextAnalysisResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 450));

  return {
    ...sampleAnalysis,
    projectTitle: projectTitle.trim() || sampleAnalysis.projectTitle,
    contextSummary:
      inputText.trim().length > 0
        ? sampleAnalysis.contextSummary
        : ["분석할 프로젝트 기록을 입력하면 팀이 공유해야 할 맥락을 구조화합니다."],
  };
}
