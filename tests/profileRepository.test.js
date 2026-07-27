import assert from "node:assert/strict";
import test from "node:test";

import { recommendSitesRequestSchema } from "../server/schemas/siteRecommendationSchemas.js";
import { createProfileRepository } from "../server/services/profileRepository.js";

function createProfileClient(row) {
  return {
    from(table) {
      assert.equal(table, "profiles");
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

function createMultiProfileClient() {
  const rows = new Map();

  return {
    from(table) {
      assert.equal(table, "profiles");
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
          rows.set(row.user_id, { ...row, updated_at: "2026-07-27T00:00:00.000Z" });
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

function createProfile(school) {
  return {
    availableHoursPerWeek: null,
    canJoinTeam: true,
    gpa: null,
    grade: 2,
    incomeBracket: null,
    interests: ["AI"],
    languageScores: [],
    majors: ["컴퓨터학부"],
    regions: ["대구"],
    school,
  };
}
test("Supabase의 오프셋 datetime 프로필은 추천 요청 전 표준 UTC 형식으로 정규화한다", async () => {
  const repository = createProfileRepository({
    createUserClient: () => createProfileClient({
      user_id: "account-a",
      updated_at: "2026-07-21T12:34:56+00:00",
      school: "경북대학교",
      grade: 2,
      majors: ["컴퓨터학부"],
      interests: ["AI"],
      regions: ["대구"],
      can_join_team: true,
      available_hours_per_week: null,
      gpa: null,
      income_bracket: null,
      language_scores: [],
    }),
  });

  const profile = await repository.getProfile({ accessToken: "token-a", userId: "account-a" });
  assert.equal(profile.updatedAt, "2026-07-21T12:34:56.000Z");
  assert.equal(recommendSitesRequestSchema.safeParse({ profile }).success, true);
});

test("프로필 조회와 초기화는 다른 계정의 프로필을 건드리지 않는다", async () => {
  const client = createMultiProfileClient();
  const repository = createProfileRepository({ createUserClient: () => client });

  await repository.upsertProfile({ accessToken: "token-a", userId: "account-a", profile: createProfile("경북대학교") });
  await repository.upsertProfile({ accessToken: "token-b", userId: "account-b", profile: createProfile("서울대학교") });

  assert.equal((await repository.getProfile({ accessToken: "token-a", userId: "account-a" })).school, "경북대학교");
  assert.equal((await repository.getProfile({ accessToken: "token-b", userId: "account-b" })).school, "서울대학교");

  await repository.deleteProfile({ accessToken: "token-a", userId: "account-a" });

  assert.equal(await repository.getProfile({ accessToken: "token-a", userId: "account-a" }), null);
  assert.equal((await repository.getProfile({ accessToken: "token-b", userId: "account-b" })).school, "서울대학교");
})
