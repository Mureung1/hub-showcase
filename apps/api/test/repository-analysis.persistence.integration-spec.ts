import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { RepositoryAnalysisPersistence } from "../src/repository-analysis/infrastructure/persistence/repository-analysis.persistence";
import { SupabaseClientService } from "../src/supabase/supabase-client.service";

const describeRemote = process.env.RUN_SUPABASE_INTEGRATION === "1" ? describe : describe.skip;

jest.setTimeout(30_000);

describeRemote("Remote Supabase Repository analysis persistence", () => {
  const uniqueSuffix = randomUUID();
  const githubRepositoryId = Date.now() * 1_000 + Math.floor(Math.random() * 1_000);
  const resultHash = `integration-${uniqueSuffix}`;
  const analyzedAt = new Date().toISOString();
  let supabase: SupabaseClientService;
  let persistence: RepositoryAnalysisPersistence;

  beforeAll(() => {
    supabase = new SupabaseClientService(new ConfigService(process.env));
    persistence = new RepositoryAnalysisPersistence(supabase);
  });

  afterAll(async () => {
    if (!supabase) {
      return;
    }

    await supabase.client
      .from("repositories")
      .delete()
      .eq("github_repository_id", githubRepositoryId);
  });

  it("stores, reuses, and cascades a complete analysis snapshot", async () => {
    const input = {
      targetGithubLogin: "ptop-integration-user",
      analyzedAt,
      resultHash,
      analyzerVersion: "repository-integration-v1",
      source: {
        repository: {
          githubRepositoryId,
          url: `https://github.com/ptop-test/${uniqueSuffix}`,
          owner: "ptop-test",
          name: uniqueSuffix,
          description: "PtoP remote persistence integration test",
          defaultBranch: "main",
          visibility: "public" as const,
          isFork: false,
          isArchived: false,
          topics: ["ptop-integration-test"],
          licenseSpdxId: null,
          homepageUrl: null,
          githubCreatedAt: analyzedAt,
          lastPushedAt: analyzedAt,
          languages: { TypeScript: 100 },
        },
        contributors: [{ login: "ptop-integration-user", commitCount: 1 }],
        commits: [
          {
            sha: uniqueSuffix.replaceAll("-", ""),
            authorLogin: "ptop-integration-user",
            message: "test: verify remote Supabase persistence",
            committedAt: analyzedAt,
            url: `https://github.com/ptop-test/${uniqueSuffix}/commit/test`,
          },
        ],
      },
      contributors: [
        {
          login: "ptop-integration-user",
          commitCount: 1,
          commitActivityPercent: 100,
        },
      ],
    };

    try {
      const first = await persistence.save(input);
      const second = await persistence.save(input);

      expect(first.reused).toBe(false);
      expect(second).toEqual({ analysisResultId: first.analysisResultId, reused: true });

      const { data: repository, error: repositoryError } = await supabase.client
        .from("repositories")
        .select("id")
        .eq("github_repository_id", githubRepositoryId)
        .single();
      expect(repositoryError).toBeNull();
      expect(repository?.id).toBeDefined();

      const { data: analysis, error: analysisError } = await supabase.client
        .from("analysis_results")
        .select("id, status, result_hash")
        .eq("id", first.analysisResultId)
        .single();
      expect(analysisError).toBeNull();
      expect(analysis).toEqual({
        id: first.analysisResultId,
        status: "completed",
        result_hash: resultHash,
      });

      const { count: contributorCount, error: contributorError } = await supabase.client
        .from("contributor_metrics")
        .select("id", { count: "exact", head: true })
        .eq("analysis_result_id", first.analysisResultId);
      expect(contributorError).toBeNull();
      expect(contributorCount).toBe(1);

      const { count: evidenceCount, error: evidenceError } = await supabase.client
        .from("analysis_evidence")
        .select("id", { count: "exact", head: true })
        .eq("analysis_result_id", first.analysisResultId);
      expect(evidenceError).toBeNull();
      expect(evidenceCount).toBe(1);

      const { error: deleteError } = await supabase.client
        .from("repositories")
        .delete()
        .eq("id", repository!.id);
      expect(deleteError).toBeNull();

      const { data: deletedAnalysis, error: cascadeError } = await supabase.client
        .from("analysis_results")
        .select("id")
        .eq("id", first.analysisResultId)
        .maybeSingle();
      expect(cascadeError).toBeNull();
      expect(deletedAnalysis).toBeNull();
    } finally {
      await supabase.client
        .from("repositories")
        .delete()
        .eq("github_repository_id", githubRepositoryId);
    }
  });
});
