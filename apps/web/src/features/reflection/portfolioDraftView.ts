export function normalizeDraftListItems(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

export function getPortfolioDraftLoadingSteps(): string[] {
  return [
    "Repository 근거 확인",
    "회고와 기술적 도전 연결",
    "포트폴리오 초안 구성",
  ];
}

export function getPortfolioPdfFileName(
  githubOwner: string,
  repositoryName: string,
): string {
  const normalizeSegment = (value: string) =>
    value.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");

  return `${normalizeSegment(githubOwner) || "github-user"}_${normalizeSegment(repositoryName) || "repository"}_PtoP`;
}
