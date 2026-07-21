import { describe, it, expect } from "vitest";
import { getMemoryNudge, type CompletedTaskLike } from "./memoryNudge.js";
import {
  MICROTASK_TEMPLATES,
  CUSTOM_FALLBACK_MICROTASKS,
} from "./microtaskTemplates.js";

// 완료 task 하나를 만드는 헬퍼(필요한 필드만 채우고 나머지는 기본값).
function doneTask(over: Partial<CompletedTaskLike> = {}): CompletedTaskLike {
  return {
    id: over.id ?? "t1",
    title: over.title ?? "지난 과제",
    type: over.type ?? "개인공부",
    status: over.status ?? "done",
    reason: over.reason ?? "overwhelm",
    customReasonText: over.customReasonText ?? null,
    createdAt: over.createdAt,
  };
}

// 무작위성을 제거하기 위한 결정적 generate 스텁 — 호출 인자를 그대로 문자열로 되돌려준다.
const echo = ({ type, reason }: { type: string; reason: string }) =>
  `MT:${type}:${reason}`;

describe("getMemoryNudge", () => {
  it("같은 reason 완료 이력이 있으면 그때 유형·이유로 만든 마이크로태스크를 반환한다 (happy path)", () => {
    const result = getMemoryNudge(
      { id: "cur", reason: "overwhelm" },
      [doneTask({ id: "t1", type: "리포트/글쓰기", reason: "overwhelm" })],
      echo,
    );
    expect(result).not.toBeNull();
    // 재생성은 매칭된 과거 task의 type + 현재 reason으로 이뤄진다.
    expect(result?.microtask).toBe("MT:리포트/글쓰기:overwhelm");
    expect(result?.source).toEqual({
      id: "t1",
      title: "지난 과제",
      type: "리포트/글쓰기",
    });
  });

  it("같은 reason 완료 이력이 없으면 null을 반환한다 (경계)", () => {
    const result = getMemoryNudge(
      { id: "cur", reason: "overwhelm" },
      [doneTask({ id: "t1", reason: "dislike" })],
      echo,
    );
    expect(result).toBeNull();
  });

  it("완료 이력이 아예 없으면 null을 반환한다 (경계)", () => {
    expect(getMemoryNudge({ reason: "overwhelm" }, [], echo)).toBeNull();
  });

  it("현재 task에 reason이 없으면 매칭 기준이 없어 null을 반환한다 (경계)", () => {
    const result = getMemoryNudge(
      { reason: null },
      [doneTask({ reason: "overwhelm" })],
      echo,
    );
    expect(result).toBeNull();
  });

  it("done 상태가 아닌(진행 중) 이력은 매칭에서 제외한다 (방어)", () => {
    const result = getMemoryNudge(
      { reason: "overwhelm" },
      [doneTask({ id: "t1", reason: "overwhelm", status: "active" })],
      echo,
    );
    expect(result).toBeNull();
  });

  it("현재 task 자신은 이력으로 취급하지 않는다 (방어)", () => {
    const result = getMemoryNudge(
      { id: "same", reason: "overwhelm" },
      [doneTask({ id: "same", reason: "overwhelm" })],
      echo,
    );
    expect(result).toBeNull();
  });

  describe("custom 이유 매칭", () => {
    it("custom끼리는 실제 사유 텍스트가 같아야 매칭한다 (공백/대소문자 정규화)", () => {
      const result = getMemoryNudge(
        { reason: "custom", customReasonText: "  놀고  싶어서 " },
        [
          doneTask({
            id: "t1",
            reason: "custom",
            customReasonText: "놀고 싶어서",
          }),
        ],
        echo,
      );
      expect(result?.source.id).toBe("t1");
    });

    it("custom끼리라도 실제 사유가 다르면 매칭하지 않는다 (경계)", () => {
      const result = getMemoryNudge(
        { reason: "custom", customReasonText: "놀고 싶어서" },
        [
          doneTask({
            id: "t1",
            reason: "custom",
            customReasonText: "몸이 아파서",
          }),
        ],
        echo,
      );
      expect(result).toBeNull();
    });

    it("custom인데 사유 텍스트가 비어 있으면(무엇으로 성공했는지 모름) 매칭하지 않는다 (경계)", () => {
      const result = getMemoryNudge(
        { reason: "custom", customReasonText: "" },
        [doneTask({ id: "t1", reason: "custom", customReasonText: "" })],
        echo,
      );
      expect(result).toBeNull();
    });
  });

  it("같은 이유로 성공한 이력이 여럿이면 가장 최근에 만든 것을 재제안한다 (동작)", () => {
    const result = getMemoryNudge(
      { reason: "temptation" },
      [
        doneTask({
          id: "old",
          reason: "temptation",
          type: "시험공부",
          createdAt: "2026-07-01T00:00:00Z",
        }),
        doneTask({
          id: "new",
          reason: "temptation",
          type: "코딩 실습",
          createdAt: "2026-07-20T00:00:00Z",
        }),
      ],
      echo,
    );
    expect(result?.source.id).toBe("new");
    expect(result?.microtask).toBe("MT:코딩 실습:temptation");
  });

  it("generate를 주입하지 않으면 실제 getMicrotask로 해당 type/reason 풀의 문구를 만든다 (기본 경로)", () => {
    const result = getMemoryNudge({ reason: "overwhelm" }, [
      doneTask({ id: "t1", type: "개인공부", reason: "overwhelm" }),
    ]);
    expect(result).not.toBeNull();
    expect(MICROTASK_TEMPLATES["개인공부"].overwhelm).toContain(result?.microtask);
  });

  it("기본 경로에서 custom 이력이면 커스텀 폴백 문구를 재생성한다 (기본 경로)", () => {
    const result = getMemoryNudge({ reason: "custom", customReasonText: "그냥요" }, [
      doneTask({ id: "t1", reason: "custom", customReasonText: "그냥요" }),
    ]);
    expect(result).not.toBeNull();
    expect(CUSTOM_FALLBACK_MICROTASKS).toContain(result?.microtask);
  });
});
