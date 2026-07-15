import assert from "node:assert/strict";
import test from "node:test";

import { profileSchema } from "../server/schemas/analyzeSchemas.js";

test("서버 프로필 스키마가 표준 선택 필드의 null과 어학성적을 보존한다", () => {
  const result = profileSchema.parse({
    id: "profile-test",
    updatedAt: "2026-07-15T00:00:00.000Z",
    school: "경북대학교",
    grade: 2,
    majors: ["컴퓨터학부"],
    interests: ["AI"],
    regions: ["대구", "온라인"],
    canJoinTeam: true,
    availableHoursPerWeek: null,
    gpa: null,
    incomeBracket: null,
    languageScores: [{ type: "TOEIC", score: "850" }],
  });

  assert.equal(result.availableHoursPerWeek, null);
  assert.equal(result.gpa, null);
  assert.equal(result.incomeBracket, null);
  assert.deepEqual(result.languageScores, [{ type: "TOEIC", score: "850" }]);
});
