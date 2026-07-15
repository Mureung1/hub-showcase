import assert from "node:assert/strict";
import test from "node:test";

import {
  createUserProfileFromDraft,
  readUserProfile,
  saveUserProfile,
  USER_PROFILE_STORAGE_KEY,
} from "../src/storage/profileStore.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

const draft = {
  school: "경북대학교",
  grade: "2",
  majors: "컴퓨터학부, 수학",
  interests: "AI, 소프트웨어, 공모전",
  regions: "대구, 온라인",
  canJoinTeam: true,
  availableHoursPerWeek: "6",
  gpa: "",
  incomeBracket: "",
  languageScores: [{ type: "TOEIC", score: "850" }],
};

test("프로필을 표준 구조로 저장하고 다시 불러온다", () => {
  const storage = createMemoryStorage();
  const profile = createUserProfileFromDraft(draft);
  const saved = saveUserProfile(profile, storage);
  const restored = readUserProfile(storage);

  assert.deepEqual(restored, saved);
  assert.equal(restored.grade, 2);
  assert.deepEqual(restored.majors, ["컴퓨터학부", "수학"]);
  assert.equal(restored.gpa, null);
  assert.deepEqual(restored.languageScores, [{ type: "TOEIC", score: "850" }]);
});

test("허용하지 않은 민감 필드는 localStorage에 기록하지 않는다", () => {
  const storage = createMemoryStorage();
  const profile = {
    ...createUserProfileFromDraft(draft),
    apiKey: "secret-key",
    password: "password",
    token: "auth-token",
  };

  saveUserProfile(profile, storage);
  const rawValue = storage.getItem(USER_PROFILE_STORAGE_KEY);

  assert.doesNotMatch(rawValue, /secret-key|password|auth-token/);
  assert.equal(Object.hasOwn(JSON.parse(rawValue), "password"), false);
});

test("깨진 JSON이나 필수값이 없는 저장 데이터는 앱을 중단하지 않고 무시한다", () => {
  const storage = createMemoryStorage();
  storage.setItem(USER_PROFILE_STORAGE_KEY, "{not-json");
  assert.equal(readUserProfile(storage), null);

  storage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify({ school: "경북대학교" }));
  assert.equal(readUserProfile(storage), null);
});
