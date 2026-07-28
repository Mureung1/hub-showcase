import type {
  TechnicalChallengeCandidate,
  TechnicalChallengeEvidenceReference,
} from "./repository-analysis";

export type ReflectionChallengeAnswers = {
  context: string;
  decision: string;
  contribution: string;
};

export type ReflectionAlignment =
  | "matched"
  | "partial"
  | "mismatched"
  | "no_evidence";

export type ReflectionAnalysis = {
  alignment: ReflectionAlignment;
  matchedChallengeTitle: string | null;
  matchedChallengeEvidence: TechnicalChallengeEvidenceReference[];
  message: string;
  portfolioSummary: string | null;
  portfolioDraft: PortfolioDraft | null;
  requiresUserConfirmation: boolean;
  /** Repository 근거와 초기 회고를 다시 대조해 만든 보완 후보입니다. */
  suggestedChallenges?: TechnicalChallengeCandidate[];
};

export type PortfolioImplementationStep = {
  summary: string;
  filePath: string | null;
  rationale: string;
  evidenceRefs: string[];
};

export type PortfolioDraft = {
  title: string;
  technicalChallenge?: string;
  background: string;
  problem: string;
  solution: string;
  /** Solution을 구현 단위, 작성 이유, 검증 근거로 확장한 정보입니다. */
  implementationSteps?: PortfolioImplementationStep[];
  decisionRationale?: string[];
  tradeoffs?: string[];
  validation?: string[];
  contribution: string;
  keyDecisions?: string[];
  result?: string;
  learnings?: string[];
  evidenceSummary: string;
  requiresUserReview: boolean;
};

export type ReflectionDraft = {
  motivation: string;
  role: string;
  memorableProblem: string;
  postAnalysisReflection: string;
  attempts: string;
  improvement: string;
  customChallengeTitle: string;
  customChallengeNote: string;
  selectedChallengeTitles: string[];
  challengeAnswers: Record<string, ReflectionChallengeAnswers>;
};

export type ReflectionDraftSaveRequest = {
  draft: ReflectionDraft;
  technicalChallenges?: Array<{
    title: string;
    summary: string;
    background: string | null;
    problem: string | null;
    solution: string | null;
    technicalChallenge: string;
    whyItMatters: string;
    confidence: "high" | "medium" | "low";
    requiresUserConfirmation: boolean;
    evidence: TechnicalChallengeEvidenceReference[];
  }>;
};

export type ReflectionDraftSaveResponse = {
  analysisResultId: string;
  draft: ReflectionDraft;
  savedAt: string;
  reflectionAnalysis?: ReflectionAnalysis | null;
};
