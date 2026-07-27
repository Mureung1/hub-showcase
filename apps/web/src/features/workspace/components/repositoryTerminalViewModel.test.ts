import assert from "node:assert/strict";
import test from "node:test";
import { getRepositoryTerminalStatus } from "./repositoryTerminalViewModel";

test("returns the Figma terminal copy for the idle state", () => {
  assert.deepEqual(getRepositoryTerminalStatus("idle", false), {
    label: "안녕! 새로운 Repository를 분석해볼까?",
    description: "분석하고 싶은 GitHub 주소를 여기에 입력해줘!",
    tone: "idle",
  });
});

test("keeps analysis completion in the terminal until the user confirms", () => {
  assert.deepEqual(getRepositoryTerminalStatus("success", true), {
    label: "분석 준비가 끝났어요.",
    description: "회고를 마무리한 뒤 결과 확인하기를 눌러 주세요.",
    tone: "success",
  });
});

test("exposes an actionable error message without closing the terminal", () => {
  assert.deepEqual(getRepositoryTerminalStatus("error", false), {
    label: "분석을 시작할 수 없어요.",
    description: "입력값을 확인한 뒤 다시 시도해 주세요.",
    tone: "error",
  });
});

test("uses a loading status that tells the user the terminal remains open", () => {
  assert.deepEqual(getRepositoryTerminalStatus("loading", false), {
    label: "Repository를 살펴보고 있어요.",
    description: "참여자와 작업 흐름을 확인하는 중입니다.",
    tone: "idle",
  });
});
