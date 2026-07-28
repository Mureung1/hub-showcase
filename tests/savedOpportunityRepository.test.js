import assert from "node:assert/strict";
import test from "node:test";

import { createSavedOpportunityRepository } from "../server/services/savedOpportunityRepository.js";

function createAnalysis(id = "analysis-1", sourceUrl = "https://example.com/notices/1") {
  return {
    id,
    analyzedAt: "2026-07-23T00:00:00.000Z",
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
      sourceUrl,
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
    tasks: [
      {
        dueDate: "2026-08-30",
        id: `task-${id}`,
        status: "todo",
        title: `${id} 제출 준비`,
      },
    ],
  };
}

function createFakeClient() {
  const rows = [];
  let sequence = 0;

  class Query {
    constructor(operation = "select", payload = null) {
      this.operation = operation;
      this.payload = payload;
      this.filters = [];
    }

    select() { return this; }
    order() { return this; }
    eq(field, value) { this.filters.push((row) => row[field] === value); return this; }
    is(field, value) { this.filters.push((row) => row[field] === value); return this; }
    update(payload) { this.operation = "update"; this.payload = payload; return this; }
    insert(payload) { this.operation = "insert"; this.payload = payload; return this; }
    delete() { this.operation = "delete"; return this; }

    matchingRows() {
      return rows.filter((row) => this.filters.every((filter) => filter(row)));
    }

    async limit(limit) {
      return { data: this.matchingRows().slice(0, limit), error: null };
    }

    async single() {
      if (this.operation === "insert") {
        const row = { ...this.payload, id: `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`, saved_at: new Date().toISOString() };
        rows.push(row);
        return { data: row, error: null };
      }
      if (this.operation === "update") {
        const row = this.matchingRows()[0];
        Object.assign(row, this.payload);
        return { data: row, error: null };
      }
      return { data: this.matchingRows()[0] || null, error: null };
    }

    async execute() {
      if (this.operation === "delete") {
        const targets = new Set(this.matchingRows());
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (targets.has(rows[index])) rows.splice(index, 1);
        }
        return { error: null };
      }
      return { data: this.matchingRows(), error: null };
    }

    then(resolve, reject) { return this.execute().then(resolve, reject); }
  }

  return {
    client: { from() { return new Query(); } },
    rows,
  };
}

test("저장 공고는 사용자별로 분리되고 같은 원문 URL은 중복 대신 갱신된다", async () => {
  const { client } = createFakeClient();
  const repository = createSavedOpportunityRepository({ createUserClient: () => client });
  const first = await repository.saveOpportunity({ accessToken: "token-a", analysis: createAnalysis(), userId: "user-a" });
  const updated = await repository.saveOpportunity({
    accessToken: "token-a",
    analysis: { ...createAnalysis(), opportunity: { ...createAnalysis().opportunity, title: "수정된 AI 공모전" } },
    userId: "user-a",
  });
  await repository.saveOpportunity({ accessToken: "token-b", analysis: createAnalysis("analysis-b"), userId: "user-b" });

  const userAItems = await repository.listOpportunities({ accessToken: "token-a", userId: "user-a" });
  const userBItems = await repository.listOpportunities({ accessToken: "token-b", userId: "user-b" });

  assert.equal(first.storageId, updated.storageId);
  assert.equal(userAItems.length, 1);
  assert.equal(userAItems[0].opportunity.title, "수정된 AI 공모전");
  assert.equal(userBItems.length, 1);
  assert.equal(userBItems[0].id, "analysis-b");
  assert.equal(userAItems[0].tasks[0].id, "task-analysis-1");
  assert.equal(userBItems[0].tasks[0].id, "task-analysis-b");
});

test("저장 공고 삭제는 요청한 사용자의 항목에만 적용된다", async () => {
  const { client } = createFakeClient();
  const repository = createSavedOpportunityRepository({ createUserClient: () => client });
  const userAItem = await repository.saveOpportunity({ accessToken: "token-a", analysis: createAnalysis(), userId: "user-a" });
  await repository.saveOpportunity({ accessToken: "token-b", analysis: createAnalysis("analysis-b"), userId: "user-b" });

  await repository.deleteOpportunity({ accessToken: "token-a", opportunityId: userAItem.storageId, userId: "user-a" });

  assert.equal((await repository.listOpportunities({ accessToken: "token-a", userId: "user-a" })).length, 0);
  assert.equal((await repository.listOpportunities({ accessToken: "token-b", userId: "user-b" })).length, 1);
});