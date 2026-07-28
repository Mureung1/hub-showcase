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
