import type { AnalysisStatus } from "../../repository-analysis/repositoryAnalysis";

export type RepositoryTerminalTone = "idle" | "success" | "error";

export type RepositoryTerminalStatus = {
  label: string;
  description: string;
  tone: RepositoryTerminalTone;
};

export function getRepositoryTerminalStatus(
  status: AnalysisStatus,
  hasResult: boolean,
): RepositoryTerminalStatus {
  if (status === "loading") {
    return {
      label: "Repository를 살펴보고 있어요.",
      description: "참여자와 작업 흐름을 확인하는 중입니다.",
      tone: "idle",
    };
  }

  if (status === "success" && hasResult) {
    return {
      label: "분석 준비가 끝났어요.",
      description: "회고를 마무리한 뒤 결과 확인하기를 눌러 주세요.",
      tone: "success",
    };
  }

  if (status === "error") {
    return {
      label: "분석을 시작할 수 없어요.",
      description: "입력값을 확인한 뒤 다시 시도해 주세요.",
      tone: "error",
    };
  }

  return {
    label: "안녕! 새로운 Repository를 분석해볼까?",
    description: "분석하고 싶은 GitHub 주소를 여기에 입력해줘!",
    tone: "idle",
  };
}
