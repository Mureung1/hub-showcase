import type {
  RepositoryAnalysisEvidence,
  TechnicalChallengeCandidate,
} from "@ptop/contracts";

export const MAX_SELECTED_CHALLENGES = 1;

export function toggleSelectedChallengeTitles(
  selectedTitles: string[],
  title: string,
): { titles: string[]; blocked: boolean } {
  if (selectedTitles.includes(title)) {
    return {
      titles: selectedTitles.filter((selectedTitle) => selectedTitle !== title),
      blocked: false,
    };
  }

  // MVP에서는 후보와 회고, 포트폴리오 초안을 하나의 흐름으로 연결한다.
  // 다른 후보를 누르면 기존 선택을 새 후보로 교체해 별도의 해제 동작을 요구하지 않는다.
  return { titles: [title], blocked: false };
}

export function getSelectionBlockMessage(selectedTitles: string[]): string {
  return selectedTitles.length === 0
    ? "기술적 도전 후보를 하나 이상 선택해야 다음 단계로 이동할 수 있어요."
    : "기술적 도전 후보는 하나만 선택할 수 있어요.";
}

export function createCustomTechnicalChallengeCandidate(
  title: string,
  note: string,
  repositoryEvidence: RepositoryAnalysisEvidence[],
): TechnicalChallengeCandidate {
  const normalizedTitle = title.trim();
  const normalizedNote = note.trim();

  return {
    title: normalizedTitle,
    summary: normalizedNote || "사용자가 직접 추가한 기술적 도전입니다.",
    background: null,
    problem: normalizedNote || null,
    solution: null,
    technicalChallenge: normalizedTitle,
    whyItMatters: "사용자가 직접 경험했다고 판단한 문제를 Repository 근거와 다시 확인합니다.",
    confidence: "low",
    requiresUserConfirmation: true,
    evidence: repositoryEvidence.slice(0, 12).map((item) => ({
      evidenceType: item.evidenceType,
      referenceId: item.referenceId,
      title: item.title,
      url: item.url,
      filePath: item.filePath,
    })),
  };
}
