import assert from "node:assert/strict";
import test from "node:test";

import { profileRequestSchema } from "../server/schemas/profileSchemas.js";

const validProfile = {
  availableHoursPerWeek: null,
  canJoinTeam: true,
  gpa: null,
  grade: 2,
  incomeBracket: null,
  interests: ["AI"],
  languageScores: [],
  majors: ["컴퓨터학부"],
  regions: ["대구", "온라인"],
  school: "경북대학교",
};

test("프로필 API 입력은 클라이언트가 보낸 userId와 내부 식별자를 소유자 정보로 사용하지 않는다", () => {
  const result = profileRequestSchema.parse({
    ...validProfile,
    id: "client-profile-id",
    updatedAt: "2026-07-20T00:00:00.000Z",
    userId: "another-account",
  });

  assert.equal(Object.hasOwn(result, "id"), false);
  assert.equal(Object.hasOwn(result, "updatedAt"), false);
  assert.equal(Object.hasOwn(result, "userId"), false);
});

test("프로필 API 입력은 잘못된 필수값을 거부한다", () => {
  const result = profileRequestSchema.safeParse({ ...validProfile, grade: 0 });
  assert.equal(result.success, false);
});
