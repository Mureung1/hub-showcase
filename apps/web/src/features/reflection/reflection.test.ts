import assert from "node:assert/strict";
import test from "node:test";
import {
  addSelectedChallenge,
  createEmptyReflectionDraft,
  loadReflectionDraft,
  saveReflectionDraft,
  type ReflectionStorage,
} from "./reflection";

function createMemoryStorage(initial: Record<string, string> = {}): ReflectionStorage & {
  values: Record<string, string>;
} {
  const values = { ...initial };

  return {
    values,
    getItem(key) {
      return values[key] ?? null;
    },
    setItem(key, value) {
      values[key] = value;
    },
  };
}

test("creates an empty reflection draft with the common prompt fields", () => {
  const draft = createEmptyReflectionDraft();

  assert.deepEqual(draft, {
    motivation: "",
    role: "",
    memorableProblem: "",
    attempts: "",
    improvement: "",
    customChallengeTitle: "",
    customChallengeNote: "",
    selectedChallengeTitles: [],
    challengeAnswers: {},
  });
});

test("saves and restores a reflection draft per repository", () => {
  const storage = createMemoryStorage();
  const draft = {
    ...createEmptyReflectionDraft(),
    motivation: "팀 프로젝트의 분석 흐름을 개선하기 위해 시작했습니다.",
  };

  saveReflectionDraft("https://github.com/owner/repo", draft, storage);

  assert.deepEqual(loadReflectionDraft("https://github.com/owner/repo", storage), draft);
  assert.deepEqual(
    loadReflectionDraft("https://github.com/other/repo", storage),
    createEmptyReflectionDraft(),
  );
});

test("ignores invalid reflection data saved in storage", () => {
  const storage = createMemoryStorage({
    "ptop:reflection-draft:https%3A%2F%2Fgithub.com%2Fowner%2Frepo": "not-json",
  });

  assert.deepEqual(
    loadReflectionDraft("https://github.com/owner/repo", storage),
    createEmptyReflectionDraft(),
  );
});

test("keeps at most two selected technical challenge candidates", () => {
  const draft = createEmptyReflectionDraft();

  assert.deepEqual(addSelectedChallenge(draft, "API 안정성"), ["API 안정성"]);
  assert.deepEqual(addSelectedChallenge({ ...draft, selectedChallengeTitles: ["API 안정성"] }, "상태 관리"), [
    "API 안정성",
    "상태 관리",
  ]);
  assert.deepEqual(
    addSelectedChallenge(
      { ...draft, selectedChallengeTitles: ["API 안정성", "상태 관리"] },
      "성능 개선",
    ),
    ["API 안정성", "상태 관리"],
  );
  assert.deepEqual(
    addSelectedChallenge(
      { ...draft, selectedChallengeTitles: ["API 안정성", "상태 관리"] },
      "API 안정성",
    ),
    ["상태 관리"],
  );
});
