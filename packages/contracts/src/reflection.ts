import type { TechnicalChallengeEvidenceReference } from "./repository-analysis";

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
  requiresUserConfirmation: boolean;
};

export type ReflectionDraft = {
  motivation: string;
  role: string;
  memorableProblem: string;
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
