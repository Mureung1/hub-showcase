import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MICROTASK_TEMPLATES } from "../lib/microtaskTemplates";
import { requestLv2Microtask } from "../lib/microtaskApi";
import NudgeModal from "./NudgeModal";

vi.mock("../lib/microtaskApi", () => ({
  requestLv2Microtask: vi.fn(),
}));

const TASK = {
  id: "task-lv2",
  title: "보고서 작성",
  type: "리포트/글쓰기",
  reason: "overwhelm",
  customReasonText: null,
  status: "active",
  level: 2,
  skipCount: 2,
  deadline: "2026-07-30T00:00:00.000Z",
};

function renderModal(overrides = {}) {
  const onStart = vi.fn();
  render(
    <NudgeModal
      task={{ ...TASK, ...overrides }}
      onStart={onStart}
      onClose={vi.fn()}
      checkpointLevel={null}
      onReconfirmReason={vi.fn()}
      onAddToCalendar={vi.fn()}
      completedTasks={[]}
    />,
  );
  return { onStart };
}

describe("NudgeModal Lv.2 Gemini microTask", () => {
  beforeEach(() => {
    vi.mocked(requestLv2Microtask).mockReset();
  });

  it("생성 중에는 안내를 표시하고 시작 버튼을 비활성화한다", () => {
    vi.mocked(requestLv2Microtask).mockReturnValue(new Promise(() => {}));
    renderModal();

    expect(
      screen.getByText(/지금 할 수 있는 첫 행동을 찾고 있어요/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "첫 행동 찾는 중…" }),
    ).toBeDisabled();
  });

  it("모달 표시값과 onStart에 전달되는 microTask가 동일하다", async () => {
    const sentinel = "문서 파일을 열고 제목을 입력하기";
    vi.mocked(requestLv2Microtask).mockResolvedValue({
      microTask: sentinel,
      generationSource: "gemini",
    });
    const { onStart } = renderModal();

    expect(await screen.findByText(new RegExp(sentinel))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        entryMode: "intervention",
        entryLevel: 2,
        microTask: sentinel,
        generationSource: "gemini",
        memoryEvidence: null,
      }),
    );
  });

  it("API가 rule_based 출처를 반환하면 action과 출처를 그대로 유지한다", async () => {
    const sentinel = "문서 제목 한 줄 쓰기";
    vi.mocked(requestLv2Microtask).mockResolvedValue({
      microTask: sentinel,
      generationSource: "rule_based",
    });
    const { onStart } = renderModal();

    await screen.findByText(new RegExp(sentinel));
    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        microTask: sentinel,
        generationSource: "rule_based",
      }),
    );
  });

  it("Gemini 실패 시 기존 룰베이스 결과를 표시하고 같은 값으로 시작한다", async () => {
    vi.mocked(requestLv2Microtask).mockRejectedValue(new Error("timeout"));
    const { onStart } = renderModal();

    const button = await screen.findByRole("button", {
      name: "지금 시작하기",
    });
    fireEvent.click(button);

    const session = onStart.mock.calls[0][0];
    expect(
      MICROTASK_TEMPLATES["리포트/글쓰기"].overwhelm,
    ).toContain(session.microTask);
    expect(screen.getByText(new RegExp(session.microTask))).toBeInTheDocument();
    expect(session.generationSource).toBe("rule_based");
    expect(session.memoryEvidence).toBeNull();
  });

  it("custom reason code와 자유 입력을 서로 다른 필드로 요청한다", async () => {
    vi.mocked(requestLv2Microtask).mockResolvedValue({
      microTask: "관련 파일 하나 열기",
      generationSource: "gemini",
    });
    renderModal({
      reason: "custom",
      customReasonText: "어디서 시작할지 모르겠어요",
    });

    await screen.findByText(/관련 파일 하나 열기/);
    expect(requestLv2Microtask).toHaveBeenCalledWith({
      title: TASK.title,
      type: TASK.type,
      reason: "custom",
      customReason: "어디서 시작할지 모르겠어요",
      level: 2,
    });
  });

  it("StrictMode 재실행에서 늦은 첫 effect가 최종 상태를 덮어쓰지 않는다", async () => {
    let resolveRequest;
    const pending = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    vi.mocked(requestLv2Microtask).mockReturnValue(pending);

    render(
      <StrictMode>
        <NudgeModal
          task={TASK}
          onStart={vi.fn()}
          onClose={vi.fn()}
          checkpointLevel={null}
          onReconfirmReason={vi.fn()}
          onAddToCalendar={vi.fn()}
          completedTasks={[]}
        />
      </StrictMode>,
    );

    await act(async () => {
      resolveRequest({
        microTask: "제목 입력하기",
        generationSource: "gemini",
      });
      await pending;
    });
    expect(screen.getByText(/제목 입력하기/)).toBeInTheDocument();
  });
});

describe("NudgeModal 레벨별 Focus 컨텍스트", () => {
  beforeEach(() => {
    vi.mocked(requestLv2Microtask).mockReset();
  });

  it("Lv.1은 action 없이 intervention/none으로 시작한다", () => {
    const { onStart } = renderModal({ level: 1, skipCount: 1 });

    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

    expect(onStart).toHaveBeenCalledWith({
      entryMode: "intervention",
      entryLevel: 1,
      microTask: null,
      generationSource: "none",
      memoryEvidence: null,
    });
  });

  it.each([3, 4])(
    "Lv.%s는 전체 메시지가 아니라 분리된 action만 rule_based로 전달한다",
    (level) => {
      const { onStart } = renderModal({ level, skipCount: level });
      const message = document.querySelector(".nudge-message");
      expect(message).not.toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

      const context = onStart.mock.calls[0][0];
      expect(context).toMatchObject({
        entryMode: "intervention",
        entryLevel: level,
        generationSource: "rule_based",
        memoryEvidence: null,
      });
      expect(context.microTask).toEqual(expect.any(String));
      expect(context.microTask.length).toBeGreaterThan(0);
      expect(message).toHaveTextContent(context.microTask);
      expect(context.microTask).not.toBe(message.textContent);
    },
  );
});
