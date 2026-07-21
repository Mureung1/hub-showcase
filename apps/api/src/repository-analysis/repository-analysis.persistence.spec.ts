import type { SupabaseClientService } from "../supabase/supabase-client.service";
import type { RepositoryAnalysisPersistenceInput } from "./repository-analysis.models";
import { RepositoryAnalysisPersistence } from "./repository-analysis.persistence";

type QueryResult = { data: unknown; error: { message: string } | null };

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  constructor(
    private readonly table: string,
    private readonly operations: string[],
    private readonly results: Map<string, QueryResult[]>,
    private readonly payloads: Map<string, unknown>,
  ) {}

  select(): this {
    return this;
  }

  eq(): this {
    return this;
  }

  is(): this {
    return this;
  }

  upsert(): this {
    this.operations.push(`${this.table}:upsert`);
    return this;
  }

  insert(values?: unknown): this {
    this.operations.push(`${this.table}:insert`);
    if (values !== undefined) {
      this.payloads.set(this.table, values);
    }
    return this;
  }

  update(): this {
    this.operations.push(`${this.table}:update`);
    return this;
  }

  delete(): this {
    this.operations.push(`${this.table}:delete`);
    return this;
  }

  single(): Promise<QueryResult> {
    return this.nextResult();
  }

  maybeSingle(): Promise<QueryResult> {
    return this.nextResult();
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.nextResult().then(onfulfilled, onrejected);
  }

  private nextResult(): Promise<QueryResult> {
    const queue = this.results.get(this.table) ?? [];
    return Promise.resolve(queue.shift() ?? { data: null, error: null });
  }
}

describe("RepositoryAnalysisPersistence", () => {
  const input: RepositoryAnalysisPersistenceInput = {
    targetGithubLogin: "SubJeeLee",
    analyzedAt: "2026-07-16T02:00:00.000Z",
    resultHash: "hash-123",
    analyzerVersion: "repository-v1",
    source: {
      repository: {
        githubRepositoryId: 123,
        url: "https://github.com/SubJeeLee/hub",
        owner: "SubJeeLee",
        name: "hub",
        description: "Project to Portfolio",
        defaultBranch: "main",
        visibility: "public",
        isFork: false,
        isArchived: false,
        topics: ["portfolio"],
        licenseSpdxId: "MIT",
        homepageUrl: null,
        githubCreatedAt: "2026-07-01T00:00:00Z",
        lastPushedAt: "2026-07-16T01:00:00Z",
        languages: { TypeScript: 100 },
      },
      contributors: [{ login: "SubJeeLee", commitCount: 2 }],
      commits: [
        {
          sha: "abc123",
          authorLogin: "SubJeeLee",
          message: "feat: analyze repository",
          committedAt: "2026-07-16T01:00:00Z",
          url: "https://github.com/SubJeeLee/hub/commit/abc123",
        },
      ],
    },
    contributors: [
      { login: "SubJeeLee", commitCount: 2, commitActivityPercent: 100 },
    ],
  };

  function createPersistence(results: Map<string, QueryResult[]>) {
    const operations: string[] = [];
    const payloads = new Map<string, unknown>();
    const client = {
      from: (table: string) => new FakeQueryBuilder(table, operations, results, payloads),
    };
    const persistence = new RepositoryAnalysisPersistence({
      client,
    } as unknown as SupabaseClientService);

    return { persistence, operations, payloads };
  }

  it("stores a completed analysis across all four tables", async () => {
    const { persistence, operations, payloads } = createPersistence(
      new Map([
        ["repositories", [{ data: { id: "repository-id" }, error: null }]],
        [
          "analysis_results",
          [
            { data: null, error: null },
            { data: { id: "analysis-id" }, error: null },
            { data: null, error: null },
          ],
        ],
        [
          "contributor_metrics",
          [{ data: [{ id: "contributor-id", github_login: "SubJeeLee" }], error: null }],
        ],
        ["analysis_evidence", [{ data: null, error: null }]],
      ]),
    );

    await expect(persistence.save(input)).resolves.toEqual({
      analysisResultId: "analysis-id",
      reused: false,
    });
    expect(operations).toEqual([
      "repositories:upsert",
      "analysis_results:insert",
      "contributor_metrics:insert",
      "analysis_evidence:insert",
      "analysis_results:update",
    ]);
    expect(payloads.get("analysis_results")).toEqual(
      expect.objectContaining({
        tech_stack: { languages: { TypeScript: 100 } },
        project_structure: {},
        technical_challenges: [],
        warnings: ["기존 분석 결과에는 확장 분석 정보가 포함되지 않았습니다."],
      }),
    );
    expect(payloads.get("analysis_evidence")).toEqual([
      expect.objectContaining({
        evidence_type: "commit",
        reference_id: "abc123",
        contributor_metric_id: "contributor-id",
      }),
    ]);
  });

  it("reuses an existing completed result with the same hash", async () => {
    const { persistence, operations } = createPersistence(
      new Map([
        ["repositories", [{ data: { id: "repository-id" }, error: null }]],
        ["analysis_results", [{ data: { id: "existing-id" }, error: null }]],
      ]),
    );

    await expect(persistence.save(input)).resolves.toEqual({
      analysisResultId: "existing-id",
      reused: true,
    });
    expect(operations).toEqual(["repositories:upsert"]);
  });

  it("deletes a newly created pending result when child storage fails", async () => {
    const { persistence, operations } = createPersistence(
      new Map([
        ["repositories", [{ data: { id: "repository-id" }, error: null }]],
        [
          "analysis_results",
          [
            { data: null, error: null },
            { data: { id: "analysis-id" }, error: null },
            { data: null, error: null },
          ],
        ],
        ["contributor_metrics", [{ data: null, error: { message: "insert failed" } }]],
      ]),
    );

    await expect(persistence.save(input)).rejects.toThrow("Repository 분석 저장에 실패했습니다.");
    expect(operations).toContain("analysis_results:delete");
  });
});
