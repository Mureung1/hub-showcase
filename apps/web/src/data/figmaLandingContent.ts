export type LandingStep = {
  readonly number: string;
  readonly title: string;
  readonly description: string;
};

export type AnalysisHighlight = {
  readonly title: string;
  readonly description: string;
};

export type LandingEvidenceExample = {
  readonly type: "PR" | "COMMIT" | "FILE" | "ISSUE";
  readonly reference: string;
  readonly title: string;
  readonly metadata: string;
};

export type WorkroomNote = {
  readonly title: string;
  readonly description: string;
};

export const landingSteps: readonly LandingStep[] = [
  {
    number: "01",
    title: "저장소를 붙여요",
    description:
      "프로젝트 Github 주소와 본인 GitHub ID만 넣으면 끝. 복잡하게 설치할 것도, 설정할 것도 없습니다.",
  },
  {
    number: "02",
    title: "질문 하나면 충분해요",
    description:
      "사용자의 간단한 회고를 통해 완성도 높은 포트폴리오를 제공합니다. 짧은 글도 괜찮고, 건너뛰어도 됩니다.",
  },
  {
    number: "03",
    title: "고르면 초안이 나와요",
    description:
      "여러 기술적 후보들 중 하나를 선택하면 근거·회고·판단·검증을 엮은 초안이 생성되고 PDF로 저장됩니다.",
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

export const landingEvidenceExamples: readonly LandingEvidenceExample[] = [
  {
    type: "PR",
    reference: "PR #142",
    title: "fix: retry queue with exponential backoff for github client",
    metadata: "2026-05-14 · +312 −87 · 파일 9개 · 리뷰 3건 · @SubJeeLee",
  },
  {
    type: "COMMIT",
    reference: "8f3c1a9",
    title: "refactor: split 401 refresh path from 403 rate-limit wait",
    metadata: "2026-05-13 · +96 −41 · 파일 3개",
  },
  {
    type: "FILE",
    reference: "FILE",
    title: "src/lib/github/retry-queue.ts",
    metadata: "분석 근거로 연결된 파일",
  },
  {
    type: "ISSUE",
    reference: "ISSUE #128",
    title: "큰 저장소 분석 시 간헐적 401 실패",
    metadata: "closed · 문제 정의 근거",
  },
] as const;

export const workroomNotes: readonly WorkroomNote[] = [
  {
    title: "Poppy와 함께해요",
    description:
      "첫 방문에 사용이 어려운 분들을 위해 저희 마스코트 Poppy가 안내해드려요.",
  },
  {
    title: "게임은 여기까지",
    description:
      "프로젝트를 분석을 시작하면 WASD·E는 즉시 해제되고 전문적인 UI가 나섭니다.",
  },
  {
    title: "직접 이동이 어렵다면 건너뛰기",
    description:
      "좌측 상단의 ‘새 Repository 분석’클릭 한번으로 바로 프로젝트를 분석해드립니다.",
  },
] as const;
