import { describe, expect, it } from "vitest";
import {
  buildTrustedMemoryEvidenceSnapshot,
  DoneContextValidationError,
  parseDoneContextInput,
  type MemoryEvidenceSource,
} from "./completionSnapshot.js";

describe("parseDoneContextInput", () => {
  it("신규 필드가 없는 기존 done 요청을 허용한다", () => {
    expect(parseDoneContextInput({ eventType: "done" })).toEqual({
      entryMode: null,
      generationSource: null,
      memoryEvidence: null,
    });
  });

  it("유효한 완료 컨텍스트와 sourceDoneEventId 참조를 정규화한다", () => {
    expect(
      parseDoneContextInput({
        entryMode: "intervention",
        generationSource: "history_reuse",
        memoryEvidence: { sourceDoneEventId: "  done-event-id  " },
      }),
    ).toEqual({
      entryMode: "intervention",
      generationSource: "history_reuse",
      memoryEvidence: { sourceDoneEventId: "done-event-id" },
    });
  });

  it.each([
    ["entryMode", { entryMode: "unknown" }, "invalid_entry_mode"],
    [
      "generationSource",
      { generationSource: "history_based" },
      "invalid_generation_source",
    ],
  ])("%s를 거부한다", (_label, input, code) => {
    expect(() => parseDoneContextInput(input)).toThrowError(
      expect.objectContaining<Partial<DoneContextValidationError>>({
        code: code as DoneContextValidationError["code"],
      }),
    );
  });

  it.each([
    ["배열", ["done-event-id"]],
    [
      "추가 필드",
      {
        sourceDoneEventId: "done-event-id",
        sourceTaskTitle: "클라이언트가 위조한 제목",
      },
    ],
    ["빈 sourceDoneEventId", { sourceDoneEventId: " " }],
  ])("유효하지 않은 memoryEvidence %s는 완료를 막지 않고 null 처리한다", (_label, memoryEvidence) => {
    expect(
      parseDoneContextInput({
        entryMode: "intervention",
        generationSource: "gemini",
        memoryEvidence,
      }),
    ).toEqual({
      entryMode: "intervention",
      generationSource: "gemini",
      memoryEvidence: null,
    });
  });
});

describe("buildTrustedMemoryEvidenceSnapshot", () => {
  const occurredAt = new Date("2026-07-24T10:00:00.000Z");
  const source: MemoryEvidenceSource = {
    id: "done-event-id",
    eventType: "done",
    taskId: "source-task",
    occurredAt,
    sourceMicroTask: "핵심 주장 한 문장 쓰기",
    task: {
      id: "source-task",
      title: "지난 리포트",
      type: "리포트/글쓰기",
    },
  };
  const base = {
    reference: { sourceDoneEventId: source.id },
    generationSource: "gemini" as const,
    currentTaskId: "current-task",
    currentTaskType: "리포트/글쓰기",
    source,
  };

  it("같은 유형의 유효한 done microTask만 서버 스냅샷으로 만든다", () => {
    expect(buildTrustedMemoryEvidenceSnapshot(base)).toEqual({
      sourceDoneEventId: source.id,
      sourceTaskId: source.task.id,
      sourceTaskTitle: source.task.title,
      sourceTaskType: source.task.type,
      sourceCompletedAt: occurredAt.toISOString(),
      sourceMicroTask: source.sourceMicroTask,
    });
  });

  it.each([
    ["다른 Task 유형", { source: { ...source, task: { ...source.task, type: "조별과제" } } }],
    ["microTask 없음", { source: { ...source, sourceMicroTask: null } }],
    ["done 이벤트 아님", { source: { ...source, eventType: "activated" } }],
    ["같은 Task의 기록", { source: { ...source, taskId: "current-task" } }],
    ["rule_based 출처", { generationSource: "rule_based" as const }],
  ])("%s 근거는 null로 폐기한다", (_label, overrides) => {
    expect(
      buildTrustedMemoryEvidenceSnapshot({
        ...base,
        ...overrides,
      }),
    ).toBeNull();
  });
});
