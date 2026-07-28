export type LandingStep = {
  readonly number: string;
  readonly title: string;
  readonly description: string;
};

export type AnalysisHighlight = {
  readonly title: string;
  readonly description: string;
};

export const landingSteps: readonly LandingStep[] = [
  {
    number: "01",
    title: "Repository 연결",
    description:
      "정리하고 싶은 프로젝트의 GitHub 주소만 입력하면 분석 준비가 완료됩니다.",
  },
  {
    number: "02",
    title: "마스코트 포피의 질문에 답변",
    description:
      "코드가 말해주지 못하는 당신의 진솔한 고민을 Poppy가 물어봅니다.",
  },
  {
    number: "03",
    title: "분석 결과 확인",
    description:
      "경험이 녹아든 포트폴리오를 위한 핵심 단서들이 문서화되어 나옵니다.",
  },
] as const;

export const analysisHighlights: readonly AnalysisHighlight[] = [
  {
    title: "기여도 분석",
    description: "참여 인원과 본인의 구체적인 작업 비중을 시각화합니다.",
  },
  {
    title: "기술 스택 추적",
    description: "사용한 라이브러리와 프레임워크의 활용 수준을 진단합니다.",
  },
  {
    title: "기술적 도전 발굴",
    description: "가장 치열했던 고민의 순간을 커밋 메시지에서 찾아냅니다.",
  },
] as const;
