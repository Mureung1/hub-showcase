import type { ReflectionDraft } from "@ptop/contracts";
import type { SupabaseClientService } from "../supabase/supabase-client.service";
import { ReflectionDraftPersistence } from "./reflection.persistence";

type QueryResult = { data: unknown; error: { message: string } | null };

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  readonly payloads: unknown[] = [];

  constructor(private readonly result: QueryResult) {}

  upsert(values: unknown): this {
    this.payloads.push(values);
    return this;
  }

  select(): this {
    return this;
  }

  eq(): this {
    return this;
  }

  single(): Promise<QueryResult> {
    return Promise.resolve(this.result);
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

const draft: ReflectionDraft = {
  motivation: "시작 이유",
  role: "내 역할",
  memorableProblem: "기억나는 문제",
  attempts: "",
  improvement: "",
  customChallengeTitle: "",
  customChallengeNote: "",
  selectedChallengeTitles: [],
  challengeAnswers: {},
};

describe("ReflectionDraftPersistence", () => {
  it("upserts one draft per analysis result", async () => {
    const query = new FakeQueryBuilder({
      data: {
        analysis_result_id: "analysis-id",
        draft,
        reflection_analysis: null,
        updated_at: "2026-07-22T09:00:00.000Z",
      },
      error: null,
    });
    const persistence = new ReflectionDraftPersistence({
      client: { from: jest.fn().mockReturnValue(query) },
    } as unknown as SupabaseClientService);

    await expect(persistence.save("analysis-id", draft)).resolves.toEqual({
      analysisResultId: "analysis-id",
      draft,
      savedAt: "2026-07-22T09:00:00.000Z",
      reflectionAnalysis: null,
    });
    expect(query.payloads).toEqual([
      { analysis_result_id: "analysis-id", draft, reflection_analysis: null },
    ]);
  });

  it("hides database details behind a stable persistence error", async () => {
    const query = new FakeQueryBuilder({
      data: null,
      error: { message: "secret database detail" },
    });
    const persistence = new ReflectionDraftPersistence({
      client: { from: jest.fn().mockReturnValue(query) },
    } as unknown as SupabaseClientService);

    await expect(persistence.save("analysis-id", draft)).rejects.toThrow(
      "회고 저장에 실패했습니다.",
    );
  });

  it("returns the saved draft when it exists", async () => {
    const query = new FakeQueryBuilder({
      data: {
        analysis_result_id: "analysis-id",
        draft,
        reflection_analysis: null,
        updated_at: "2026-07-22T09:00:00.000Z",
      },
      error: null,
    });
    const persistence = new ReflectionDraftPersistence({
      client: { from: jest.fn().mockReturnValue(query) },
    } as unknown as SupabaseClientService);

    await expect(persistence.find("analysis-id")).resolves.toEqual({
      analysisResultId: "analysis-id",
      draft,
      savedAt: "2026-07-22T09:00:00.000Z",
      reflectionAnalysis: null,
    });
  });

  it("returns null when no draft exists", async () => {
    const query = new FakeQueryBuilder({ data: null, error: null });
    const persistence = new ReflectionDraftPersistence({
      client: { from: jest.fn().mockReturnValue(query) },
    } as unknown as SupabaseClientService);

    await expect(persistence.find("analysis-id")).resolves.toBeNull();
  });
});
