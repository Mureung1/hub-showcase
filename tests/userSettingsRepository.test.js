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