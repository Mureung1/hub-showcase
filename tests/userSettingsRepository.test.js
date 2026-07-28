import assert from "node:assert/strict";
import test from "node:test";

import { createUserSettingsRepository } from "../server/services/userSettingsRepository.js";

function createSettingsClient() {
  let row = null;

  return {
    from(table) {
      assert.equal(table, "user_settings");
      return {
        select() {
          return {
            eq(_column, userId) {
              return {
                async maybeSingle() {
                  return { data: row?.user_id === userId ? row : null, error: null };
                },
              };
            },
          };
        },
        upsert(nextRow) {
          row = { ...nextRow };
          return {
            select() {
              return {
                async single() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        delete() {
          return {
            async eq(_column, userId) {
              if (row?.user_id === userId) row = null;
              return { error: null };
            },
          };
        },
      };
    },
  };
}

function createMultiSettingsClient() {
  const rows = new Map();

  return {
    from(table) {
      assert.equal(table, "user_settings");
      return {
        delete() {
          return {
            async eq(_column, userId) {
              rows.delete(userId);
              return { error: null };
            },
          };
        },
        select() {
          return {
            eq(_column, userId) {
              return {
                async maybeSingle() {
                  return { data: rows.get(userId) || null, error: null };
                },
              };
            },
          };
        },
        upsert(row) {
          rows.set(row.user_id, { ...row });
          return {
            select() {
              return {
                async single() {
                  return { data: rows.get(row.user_id), error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

function createSettings(minimumMatchScore) {
  return {
    autoSaveAnalyzedOpportunities: false,
    includeOnline: true,
    includeUnknownDeadline: true,
    minimumMatchScore,
    preferredRegions: ["온라인"],
    recommendationCategories: ["contest"],
    recommendationLimit: 10,
  };
}
test("설정이 없는 사용자는 기본값을 받고, 저장과 초기화는 해당 사용자 레코드만 사용한다", async () => {
  const client = createSettingsClient();
  const repository = createUserSettingsRepository({ createUserClient: () => client });
  const initial = await repository.getSettings({ accessToken: "token-a", userId: "account-a" });

  assert.equal(initial.isDefault, true);
  assert.equal(initial.settings.minimumMatchScore, 50);

  const saved = await repository.upsertSettings({
    accessToken: "token-a",
    userId: "account-a",
    settings: {
      recommendationCategories: ["contest"],
      preferredRegions: ["대구"],
      includeOnline: false,
      minimumMatchScore: 70,
      includeUnknownDeadline: false,
      autoSaveAnalyzedOpportunities: true,
      recommendationLimit: 4,
    },
  });
  assert.equal(saved.isDefault, false);
  assert.equal(saved.settings.minimumMatchScore, 70);

  const reset = await repository.resetSettings({ accessToken: "token-a", userId: "account-a" });
  assert.equal(reset.isDefault, true);
  assert.equal(reset.settings.recommendationLimit, 10);
});

test("개인 설정 초기화는 다른 계정의 추천 조건을 유지한다", async () => {
  const client = createMultiSettingsClient();
  const repository = createUserSettingsRepository({ createUserClient: () => client });

  await repository.upsertSettings({ accessToken: "token-a", userId: "account-a", settings: createSettings(65) });
  await repository.upsertSettings({ accessToken: "token-b", userId: "account-b", settings: createSettings(85) });
  await repository.resetSettings({ accessToken: "token-a", userId: "account-a" });

  const accountA = await repository.getSettings({ accessToken: "token-a", userId: "account-a" });
  const accountB = await repository.getSettings({ accessToken: "token-b", userId: "account-b" });

  assert.equal(accountA.isDefault, true);
  assert.equal(accountB.isDefault, false);
  assert.equal(accountB.settings.minimumMatchScore, 85);
})
