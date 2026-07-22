export type ReflectionChallengeAnswers = {
  context: string;
  decision: string;
  contribution: string;
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
};

export type ReflectionDraftSaveResponse = {
  analysisResultId: string;
  draft: ReflectionDraft;
  savedAt: string;
};
