import { describe, expect, it } from "vitest";
import {
  normalizeStoredMicroTask,
  selectLatestValidLv3Candidate,
} from "./lv3MemoryCandidate.js";

function doneEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "done-1",
    taskId: "past-1",
    occurredAt: new Date("2026-07-20T00:00:00Z"),
    microTask: "핵심 주장 한 문장 쓰기",
    task: {
      title: "지난 리포트",
      type: "리포트/글쓰기",
    },
    ...overrides,
  };
}

describe("selectLatestValidLv3Candidate", () => {
  it("같은 유형의 가장 최근 유효 done microTask를 선택한다", () => {
    const result = selectLatestValidLv3Candidate(
      [
        doneEvent({
          id: "old",
          occurredAt: new Date("2026-07-01T00:00:00Z"),
        }),
        doneEvent({
          id: "new",
          occurredAt: new Date("2026-07-22T00:00:00Z"),
          microTask: "  목차 후보를   세 줄로 적기 ",
        }),
      ],
      "current",
      "리포트/글쓰기",
    );

    expect(result).toEqual({
      sourceDoneEventId: "new",
      sourceTaskTitle: "지난 리포트",
      sourceMicroTask: "목차 후보를 세 줄로 적기",
    });
  });

  it("다른 유형, 현재 Task, 유효하지 않은 microTask를 제외한다", () => {
    const result = selectLatestValidLv3Candidate(
      [
        doneEvent({
          id: "wrong-type",
          task: { title: "코딩", type: "코딩 실습" },
        }),
        doneEvent({ id: "same-task", taskId: "current" }),
        doneEvent({ id: "empty", microTask: "  " }),
        doneEvent({ id: "multiline", microTask: "첫 줄\n둘째 줄" }),
      ],
      "current",
      "리포트/글쓰기",
    );

    expect(result).toBeNull();
  });
});

describe("normalizeStoredMicroTask", () => {
  it.each([
    [null],
    [""],
    ["- 목록 행동"],
    ["1. 첫 행동"],
    ["가".repeat(61)],
  ])("신뢰할 수 없는 저장값 %j을 거부한다", (value) => {
    expect(normalizeStoredMicroTask(value)).toBeNull();
  });
});
