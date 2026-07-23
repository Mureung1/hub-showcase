import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createLocalOpportunityRepository,
  getLocalOpportunityConfig,
} from "../server/services/localOpportunityRepository.js";
import { getOpportunityStorageConfig } from "../server/services/opportunityStorage.js";

function createAnalysis(id = "local-analysis-1") {
  return {
    id,
    analyzedAt: "2026-07-20T00:00:00.000Z",
    mode: "mock",
    fallbackUsed: false,
    fallbackReason: null,
    opportunity: {
      title: "로컬 DB 공모전",
      organizer: "UniRadar",
      category: "contest",
      deadline: "2026-08-31",
      target: "전국 대학생",
      eligibility: [],
      preferred: [],
      requiredDocuments: ["참가신청서"],
      benefits: ["상금"],
      activityPeriod: null,
      sourceUrl: "https://example.com/notices/local-1",
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

test("기본 저장소는 외부 키 없이 로컬 SQLite로 구성된다", () => {
  const localConfig = getLocalOpportunityConfig({});
  const storageConfig = getOpportunityStorageConfig({});

  assert.equal(localConfig.configured, true);
  assert.equal(storageConfig.provider, "sqlite");
  assert.equal(storageConfig.configured, true);
});

test("로컬 SQLite 저장소는 분석 결과를 upsert하고 최신순으로 조회한다", async () => {
  const directory = mkdtempSync(join(tmpdir(), "uniradar-local-db-"));
  const databasePath = join(directory, "opportunities.sqlite");
  const repository = createLocalOpportunityRepository({ databasePath });

  try {
    const first = createAnalysis();
    const saved = await repository.saveAnalysis(first);
    const updated = await repository.saveAnalysis({
      ...first,
      opportunity: { ...first.opportunity, title: "수정된 로컬 DB 공모전" },
    });
    const items = await repository.listAnalyses();

    assert.equal(saved.storageId, updated.storageId);
    assert.equal(items.length, 1);
    assert.equal(items[0].id, first.id);
    assert.equal(items[0].opportunity.title, "수정된 로컬 DB 공모전");
    assert.equal(items[0].mode, "mock");

    await repository.deleteAnalysis(saved.storageId);
    assert.equal((await repository.listAnalyses()).length, 0);
  } finally {
    repository.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
