import type {
  ReflectionAnalysis,
  PortfolioDraft,
  RepositoryAnalysisResult,
} from "@ptop/contracts";
import type { ReflectionDraft } from "../reflection/reflection";

export type SavedPortfolioProject = {
  id: string;
  userId: string;
  analysisResultId: string;
  repositoryUrl: string;
  repositoryOwner: string;
  repositoryName: string;
  challengeKey: string;
  challengeTitle: string;
  status: "draft_completed" | "needs_user_review";
  portfolioDraft: PortfolioDraft;
  analysisResult: RepositoryAnalysisResult;
  reflectionDraft: ReflectionDraft;
  reflectionAnalysis: ReflectionAnalysis | null;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioProjectPayload = {
  user_id: string;
  analysis_result_id: string;
  repository_url: string;
  repository_owner: string;
  repository_name: string;
  challenge_key: string;
  challenge_title: string;
  status: SavedPortfolioProject["status"];
  portfolio_draft: PortfolioDraft;
  analysis_result: RepositoryAnalysisResult;
  reflection_draft: ReflectionDraft;
  reflection_analysis: ReflectionAnalysis | null;
};

export function createChallengeKey(title: string): string {
  const normalized = title
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "untitled-challenge";
}

export function createPortfolioProjectPayload({
  userId,
  result,
  reflectionDraft,
  reflectionAnalysis,
}: {
  userId: string;
  result: RepositoryAnalysisResult;
  reflectionDraft: ReflectionDraft;
  reflectionAnalysis: ReflectionAnalysis;
}): PortfolioProjectPayload {
  const portfolioDraft = reflectionAnalysis.portfolioDraft;
  if (!portfolioDraft) {
    throw new Error("포트폴리오 초안이 없어 작업실에 저장할 수 없습니다.");
  }

  const challengeTitle =
    reflectionAnalysis.matchedChallengeTitle ??
    portfolioDraft.technicalChallenge ??
    portfolioDraft.title;

  return {
    user_id: userId,
    analysis_result_id: result.id,
    repository_url: result.repository.url,
    repository_owner: result.repository.owner,
    repository_name: result.repository.name,
    challenge_key: createChallengeKey(challengeTitle),
    challenge_title: challengeTitle,
    status: reflectionAnalysis.requiresUserConfirmation
      ? "needs_user_review"
      : "draft_completed",
    portfolio_draft: portfolioDraft,
    analysis_result: result,
    reflection_draft: reflectionDraft,
    reflection_analysis: reflectionAnalysis,
  };
}

export function mapPortfolioProjectRow(
  row: Record<string, unknown>,
): SavedPortfolioProject {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    analysisResultId: String(row.analysis_result_id),
    repositoryUrl: String(row.repository_url),
    repositoryOwner: String(row.repository_owner),
    repositoryName: String(row.repository_name),
    challengeKey: String(row.challenge_key),
    challengeTitle: String(row.challenge_title),
    status: row.status === "needs_user_review" ? "needs_user_review" : "draft_completed",
    portfolioDraft: row.portfolio_draft as PortfolioDraft,
    analysisResult: row.analysis_result as RepositoryAnalysisResult,
    reflectionDraft: row.reflection_draft as ReflectionDraft,
    reflectionAnalysis: (row.reflection_analysis as ReflectionAnalysis | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
