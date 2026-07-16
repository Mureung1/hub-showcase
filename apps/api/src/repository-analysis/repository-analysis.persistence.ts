import { Injectable } from "@nestjs/common";
import { SupabaseClientService } from "../supabase/supabase-client.service";
import type { RepositoryAnalysisPersistenceInput } from "./repository-analysis.models";

type IdentifierRow = { id: string };
type ContributorIdentifierRow = IdentifierRow & { github_login: string };

@Injectable()
export class RepositoryAnalysisPersistence {
  constructor(private readonly supabase: SupabaseClientService) {}

  async save(input: RepositoryAnalysisPersistenceInput): Promise<{
    analysisResultId: string;
    reused: boolean;
  }> {
    const repositoryId = await this.upsertRepository(input);
    const existingAnalysisId = await this.findCompletedAnalysis(repositoryId, input);

    if (existingAnalysisId) {
      return { analysisResultId: existingAnalysisId, reused: true };
    }

    const analysisResultId = await this.createPendingAnalysis(repositoryId, input);

    try {
      const contributorIds = await this.insertContributors(analysisResultId, input);
      await this.insertEvidence(analysisResultId, contributorIds, input);
      await this.completeAnalysis(analysisResultId, input);
    } catch {
      await this.deletePendingAnalysis(analysisResultId);
      throw new Error("Repository 분석 저장에 실패했습니다.");
    }

    return { analysisResultId, reused: false };
  }

  private async upsertRepository(input: RepositoryAnalysisPersistenceInput): Promise<string> {
    const repository = input.source.repository;
    const { data, error } = await this.supabase.client
      .from("repositories")
      .upsert(
        {
          github_repository_id: repository.githubRepositoryId,
          owner: repository.owner,
          name: repository.name,
          url: repository.url,
          description: repository.description,
          default_branch: repository.defaultBranch,
          visibility: repository.visibility,
          is_fork: repository.isFork,
          is_archived: repository.isArchived,
          topics: repository.topics,
          license_spdx_id: repository.licenseSpdxId,
          homepage_url: repository.homepageUrl,
          github_created_at: repository.githubCreatedAt,
          last_pushed_at: repository.lastPushedAt,
        },
        { onConflict: "github_repository_id" },
      )
      .select("id")
      .single();

    return this.requireIdentifier(data, error);
  }

  private async findCompletedAnalysis(
    repositoryId: string,
    input: RepositoryAnalysisPersistenceInput,
  ): Promise<string | null> {
    let query = this.supabase.client
      .from("analysis_results")
      .select("id")
      .eq("repository_id", repositoryId)
      .eq("analyzer_version", input.analyzerVersion)
      .eq("result_hash", input.resultHash)
      .eq("status", "completed");

    query = input.targetGithubLogin
      ? query.eq("target_github_login", input.targetGithubLogin)
      : query.is("target_github_login", null);

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error("Repository 분석 결과 조회에 실패했습니다.");
    }

    return (data as IdentifierRow | null)?.id ?? null;
  }

  private async createPendingAnalysis(
    repositoryId: string,
    input: RepositoryAnalysisPersistenceInput,
  ): Promise<string> {
    const { data, error } = await this.supabase.client
      .from("analysis_results")
      .insert({
        repository_id: repositoryId,
        target_github_login: input.targetGithubLogin,
        status: "pending",
        analyzer_version: input.analyzerVersion,
        repository_snapshot: input.source.repository,
        activity_summary: {
          contributorCount: input.contributors.length,
          commitCount: input.source.commits.length,
        },
        started_at: input.analyzedAt,
      })
      .select("id")
      .single();

    return this.requireIdentifier(data, error);
  }

  private async insertContributors(
    analysisResultId: string,
    input: RepositoryAnalysisPersistenceInput,
  ): Promise<Map<string, string>> {
    if (input.contributors.length === 0) {
      return new Map();
    }

    const { data, error } = await this.supabase.client
      .from("contributor_metrics")
      .insert(
        input.contributors.map((contributor) => ({
          analysis_result_id: analysisResultId,
          github_login: contributor.login,
          is_target: contributor.login === input.targetGithubLogin,
          commit_count: contributor.commitCount,
          commit_activity_percent: contributor.commitActivityPercent,
        })),
      )
      .select("id, github_login");

    if (error || !data) {
      throw new Error("Contributor 저장에 실패했습니다.");
    }

    return new Map(
      (data as ContributorIdentifierRow[]).map((contributor) => [
        contributor.github_login,
        contributor.id,
      ]),
    );
  }

  private async insertEvidence(
    analysisResultId: string,
    contributorIds: Map<string, string>,
    input: RepositoryAnalysisPersistenceInput,
  ): Promise<void> {
    if (input.source.commits.length === 0) {
      return;
    }

    const { error } = await this.supabase.client.from("analysis_evidence").insert(
      input.source.commits.map((commit) => ({
        analysis_result_id: analysisResultId,
        contributor_metric_id: commit.authorLogin
          ? contributorIds.get(commit.authorLogin) ?? null
          : null,
        evidence_type: "commit",
        reference_id: commit.sha,
        title: commit.message.split("\n", 1)[0],
        url: commit.url,
        occurred_at: commit.committedAt,
        metadata: { authorLogin: commit.authorLogin },
      })),
    );

    if (error) {
      throw new Error("분석 근거 저장에 실패했습니다.");
    }
  }

  private async completeAnalysis(
    analysisResultId: string,
    input: RepositoryAnalysisPersistenceInput,
  ): Promise<void> {
    const headCommit = input.source.commits[0];
    const { error } = await this.supabase.client
      .from("analysis_results")
      .update({
        status: "completed",
        analyzed_ref: input.source.repository.defaultBranch,
        head_sha: headCommit?.sha ?? "no-commit",
        result_hash: input.resultHash,
        analyzed_at: input.analyzedAt,
        last_checked_at: input.analyzedAt,
      })
      .eq("id", analysisResultId);

    if (error) {
      throw new Error("분석 완료 상태 저장에 실패했습니다.");
    }
  }

  private async deletePendingAnalysis(analysisResultId: string): Promise<void> {
    await this.supabase.client.from("analysis_results").delete().eq("id", analysisResultId);
  }

  private requireIdentifier(data: unknown, error: unknown): string {
    if (error || !data || typeof data !== "object" || !("id" in data)) {
      throw new Error("Repository 분석 저장에 실패했습니다.");
    }

    return String((data as IdentifierRow).id);
  }
}
