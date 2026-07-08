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

export type ContextAnalysisResult = {
  projectTitle: string;
  contextSummary: string[];
  keyTerms: {
    term: string;
    meaning: string;
  }[];
  decisions: {
    decision: string;
    reason: string;
    status: "confirmed" | "tentative" | "unclear";
  }[];
  perspectives: PerspectiveItem[];
  unresolvedQuestions: string[];
  knowledgeMap: {
    nodes: KnowledgeNode[];
    links: KnowledgeLink[];
  };
  onboardingSummary: string[];
};
