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