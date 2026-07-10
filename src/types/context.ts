export type NodeType = "topic" | "person" | "role" | "decision" | "question";

export type KnowledgeNode = {
  id: string;
  label: string;
  type: NodeType;
  summary: string;
};

export type KnowledgeLink = {
  from: string;
  to: string;
  relation: string;
};

export type PerspectiveItem = {
  actor: string;
  role: string;
  focus: string;
  concern: string;
  question: string;
};

export type ParticipantAgentView = {
  actor: string;
  role: string;
  priority: string;
  interpretation: string;
  evidence: string[];
  risk: string;
};

export type ParticipantAgentSynthesis = {
  views: ParticipantAgentView[];
  agreementPoints: string[];
  tensionPoints: string[];
  privacyNote: string;
};

export type ContextSummary = {
  projectTitle: string;
  overview: string[];
  sourceLength: number;
  generatedAt: string;
};

export type QuestionItem = {
  question: string;
  reason: string;
  ownerHint: string;
};

export type OnboardingSummary = {
  items: string[];
  currentDecisions: string[];
  remainingQuestions: string[];
  shareText: string;
};

export type ProviderInfo = {
  mode: "mock" | "llm";
  name: string;
  usedExternalModel: boolean;
};

export type ContextAnalysisResult = {
  projectTitle: string;
  summary: ContextSummary;
  keyTerms: {
    term: string;
    meaning: string;
  }[];
  decisions: {
    decision: string;
    reason: string;
    status: "confirmed" | "tentative" | "unclear";
  }[];
  participants: PerspectiveItem[];
  questions: QuestionItem[];
  knowledgeMap: {
    nodes: KnowledgeNode[];
    links: KnowledgeLink[];
  };
  onboardingSummary: OnboardingSummary;
  participantAgents: ParticipantAgentSynthesis;
  provider: ProviderInfo;
};
