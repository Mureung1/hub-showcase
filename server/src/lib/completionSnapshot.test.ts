import { describe, expect, it } from "vitest";
import {
  DoneContextValidationError,
  parseDoneContextInput,
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
    [
      "memoryEvidence 배열",
      { memoryEvidence: ["done-event-id"] },
      "invalid_memory_evidence",
    ],
    [
      "memoryEvidence 추가 필드",
      {
        memoryEvidence: {
          sourceDoneEventId: "done-event-id",
          sourceTaskTitle: "클라이언트가 위조한 제목",
        },
      },
      "invalid_memory_evidence",
    ],
    [
      "빈 sourceDoneEventId",
      { memoryEvidence: { sourceDoneEventId: " " } },
      "invalid_memory_evidence",
    ],
  ])("%s를 거부한다", (_label, input, code) => {
    expect(() => parseDoneContextInput(input)).toThrowError(
      expect.objectContaining<Partial<DoneContextValidationError>>({
        code: code as DoneContextValidationError["code"],
      }),
    );
  });
});
