import type {
  RepositoryAnalysisDetails,
  RepositoryAnalysisEvidence,
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
