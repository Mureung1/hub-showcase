import type {
  RepositoryAnalysisDetails,
  RepositoryAnalysisEvidence,
  TechnicalChallengeCandidate,
} from "@ptop/contracts";
import type { GitHubRepositoryAnalysisSource } from "./repository-analysis.models";

export type RepositoryContextFile = {
  path: string;
  content: string;
  priority: "critical" | "high" | "normal";
  truncated: boolean;
  estimatedTokens: number;
};

export type TechnicalChallengeContext = {
  repository: GitHubRepositoryAnalysisSource["repository"];
  analysis: RepositoryAnalysisDetails;
  files: RepositoryContextFile[];
  evidence: RepositoryAnalysisEvidence[];
  estimatedTokens: number;
  truncated: boolean;
};

export type TechnicalChallengeAiRequest = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
};

export type TechnicalChallengeAnalysisResult = {
  candidates: TechnicalChallengeCandidate[];
  warning: string | null;
};
