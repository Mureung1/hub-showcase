import assert from "node:assert/strict";
import test from "node:test";

import { createOpportunityRepository, getSupabaseOpportunityConfig } from "../server/services/opportunityRepository.js";

function createAnalysis(id = "analysis-1") {
  return {
    id,
    analyzedAt: "2026-07-16T00:00:00.000Z",
    mode: "mock",
    fallbackUsed: false,
    fallbackReason: null,
    opportunity: {
      title: "AI 공모전",
      organizer: "UniRadar",
      category: "contest",
      deadline: "2026-08-31",
      target: "전국 대학생",
      eligibility: [],
      preferred: [],
      requiredDocuments: ["참가신청서"],
      benefits: ["상금"],
      activityPeriod: null,
      sourceUrl: "https://example.com/notices/1",
      uncertainFields: [],
    },
    match: {
      status: "eligible",
      score: 88,
      summary: "지원 조건을 충족합니다.",
      matchedReasons: ["전국 대학생 대상"],
      missingInfo: [],
      disqualifyingReasons: [],
      nextActions: ["참가신청서를 준비하세요."],
    },
    tasks: [],
  };
}

function createFakeClient(record) {
  const calls = [];
  const client = {
    from(tableName) {
      calls.push({ tableName, type: "from" });
      return {
        select() {
          return {
            order() {
              return {
                async limit() {
                  return { data: [record], error: null };
                },
              };
            },
          };
        },
        upsert(row, options) {
          calls.push({ options, row, type: "upsert" });
          return {
            select() {
              return {
                async single() {
                  return { data: { ...record, analysis_result: row.analysis_result }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  return { calls, client };
}

test("Supabase 저장은 명시적으로 활성화하고 서버 키가 있어야 구성된다", () => {
  assert.equal(getSupabaseOpportunityConfig({}).configured, false);
  assert.equal(getSupabaseOpportunityConfig({
    ALLOW_SUPABASE_PERSISTENCE: "true",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-key",
  }).configured, true);
});

test("분석 결과를 단일 테이블에 upsert하고 표준 구조로 반환한다", async () => {
  const analysis = createAnalysis();
  const record = {
    id: "storage-1",
    analysis_result: analysis,
    created_at: "2026-07-16T00:00:00.000Z",
    updated_at: "2026-07-16T00:00:00.000Z",
  };
  const { calls, client } = createFakeClient(record);
  const repository = createOpportunityRepository({ client, enabled: true });

  const saved = await repository.saveAnalysis(analysis);

  assert.equal(calls[0].tableName, "opportunity_analyses");
  assert.equal(calls[1].options.onConflict, "analysis_id");
  assert.equal(calls[1].row.analysis_id, analysis.id);
  assert.equal(saved.storageId, "storage-1");
  assert.equal(saved.opportunity.title, "AI 공모전");
});

test("저장한 분석 결과는 최신순 조회용 표준 구조로 반환한다", async () => {
  const analysis = createAnalysis();
  const record = {
    id: "storage-1",
    analysis_result: analysis,
    created_at: "2026-07-16T00:00:00.000Z",
    updated_at: "2026-07-16T00:00:00.000Z",
  };
  const { client } = createFakeClient(record);
  const repository = createOpportunityRepository({ client, enabled: true });

  const saved = await repository.listAnalyses(12);

  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, analysis.id);
  assert.equal(saved[0].persistedAt, record.updated_at);
});

test("설정이 없으면 저장소 오류를 안전하게 반환한다", async () => {
  const repository = createOpportunityRepository({ enabled: false });

  await assert.rejects(
    () => repository.listAnalyses(),
    (error) => error.code === "persistence_disabled",
  );
});
