import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MICROTASK_TEMPLATES } from "../lib/microtaskTemplates";
import {
  requestLv2Microtask,
  requestLv3Microtask,
} from "../lib/microtaskApi";
import { LV3_SAFE_FALLBACKS } from "../lib/nudgeMessages";
import NudgeModal from "./NudgeModal";

vi.mock("../lib/microtaskApi", () => ({
  requestLv2Microtask: vi.fn(),
  requestLv3Microtask: vi.fn(),
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

function renderModal(overrides = {}, props = {}) {
  const onStart = vi.fn();
  const onReconfirmReason =
    props.onReconfirmReason ?? vi.fn();
  const onLv2ActionResolved =
    props.onLv2ActionResolved ?? vi.fn();
  const renderResult = render(
    <NudgeModal
      task={{ ...TASK, ...overrides }}
      onStart={onStart}
      onClose={vi.fn()}
      checkpointLevel={props.checkpointLevel ?? null}
      onReconfirmReason={onReconfirmReason}
      onLv2ActionResolved={onLv2ActionResolved}
      lv2MicroTask={props.lv2MicroTask ?? null}
      lv3ReasonChanged={props.lv3ReasonChanged ?? null}
      onAddToCalendar={vi.fn()}
      completedTasks={[]}
    />,
  );
  return {
    onStart,
    onReconfirmReason,
    onLv2ActionResolved,
    ...renderResult,
  };
}

describe("NudgeModal Lv.2 Gemini microTask", () => {
  beforeEach(() => {
    vi.mocked(requestLv2Microtask).mockReset();
    vi.mocked(requestLv3Microtask).mockReset();
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
    const { onStart, onLv2ActionResolved } = renderModal();

    expect(await screen.findByText(new RegExp(sentinel))).toBeInTheDocument();
    expect(onLv2ActionResolved).toHaveBeenCalledWith(TASK.id, sentinel);
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
    const { onStart, onLv2ActionResolved } = renderModal();

    const button = await screen.findByRole("button", {
      name: "지금 시작하기",
    });
    fireEvent.click(button);

    const session = onStart.mock.calls[0][0];
    expect(
      MICROTASK_TEMPLATES["리포트/글쓰기"].overwhelm,
    ).toContain(session.microTask);
    expect(screen.getByText(new RegExp(session.microTask))).toBeInTheDocument();
    expect(onLv2ActionResolved).toHaveBeenCalledWith(
      TASK.id,
      session.microTask,
    );
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

describe("NudgeModal Lv.3 기억 기반 microTask", () => {
  beforeEach(() => {
    vi.mocked(requestLv2Microtask).mockReset();
    vi.mocked(requestLv3Microtask).mockReset();
  });

  it("Lv3 회피 이유 재확인 전에는 생성 API를 호출하지 않는다", () => {
    renderModal(
      { level: 3, skipCount: 5 },
      {
        checkpointLevel: 3,
        onReconfirmReason: vi.fn(),
      },
    );

    expect(requestLv3Microtask).not.toHaveBeenCalled();
    expect(
      screen.getByText(/지금 막는 이유가 처음과 같나요/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/지금 막는 이유를 먼저 확인해 주세요/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/지금 할 수 있는 첫 행동을 찾고 있어요/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이유 확인 후 시작하기" }),
    ).toBeDisabled();
  });

  it("저장 성공 후 서버가 돌려준 최신 custom 이유로 한 번만 요청한다", async () => {
    const onReconfirmReason = vi.fn().mockResolvedValue({
      reason: "custom",
      customReasonText: "완벽하게 해야 할 것 같아서",
      reasonChanged: true,
    });
    vi.mocked(requestLv3Microtask).mockResolvedValue({
      status: "generated",
      microTask: "첫 슬라이드 제목에 임시 문장 하나 쓰기",
      generationSource: "gemini",
      memoryEvidence: null,
    });
    renderModal(
      { level: 3, skipCount: 5, reason: "overwhelm" },
      {
        checkpointLevel: 3,
        onReconfirmReason,
        lv2MicroTask: "발표 목차 3개 적기",
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "기타(직접입력)" }));
    fireEvent.change(screen.getByPlaceholderText("예: 완벽하게 하고 싶어서"), {
      target: { value: "완벽하게 해야 할 것 같아서" },
    });
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => {
      expect(requestLv3Microtask).toHaveBeenCalledTimes(1);
    });
    expect(requestLv3Microtask).toHaveBeenCalledWith({
      taskId: TASK.id,
      reason: "custom",
      customReason: "완벽하게 해야 할 것 같아서",
      reasonChanged: true,
      lv2MicroTask: "발표 목차 3개 적기",
      level: 3,
    });
  });

  it("이유가 같으면 Lv2 행동과 동일 이유 스냅샷을 Lv3 요청에 전달한다", async () => {
    const onReconfirmReason = vi.fn().mockResolvedValue({
      reason: "overwhelm",
      customReasonText: null,
      reasonChanged: false,
    });
    vi.mocked(requestLv3Microtask).mockResolvedValue({
      status: "generated",
      microTask: "첫 슬라이드에 발표 핵심 한 문장 쓰기",
      generationSource: "gemini",
      memoryEvidence: null,
    });
    renderModal(
      { level: 3, skipCount: 5, reason: "overwhelm" },
      {
        checkpointLevel: 3,
        onReconfirmReason,
        lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
      },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "막막해서 못 시작" }),
    );

    await waitFor(() => {
      expect(requestLv3Microtask).toHaveBeenCalledWith({
        taskId: TASK.id,
        reason: "overwhelm",
        customReason: null,
        reasonChanged: false,
        lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
        level: 3,
      });
    });
  });

  it("회피 이유 저장 실패 시 Lv3 요청을 시작하지 않는다", async () => {
    const onReconfirmReason = vi.fn().mockResolvedValue(null);
    renderModal(
      { level: 3, skipCount: 5 },
      { checkpointLevel: 3, onReconfirmReason },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "이 할일 자체가 하기 싫음" }),
    );

    await waitFor(() => {
      expect(onReconfirmReason).toHaveBeenCalledTimes(1);
    });
    expect(requestLv3Microtask).not.toHaveBeenCalled();
    expect(
      screen.getByText(/지금 막는 이유가 처음과 같나요/),
    ).toBeInTheDocument();
  });

  it("표시된 행동과 Focus 컨텍스트에 같은 Gemini 결과와 추적 참조를 사용한다", async () => {
    const microTask = "목차 후보를 세 줄로 작성하기";
    vi.mocked(requestLv3Microtask).mockResolvedValue({
      status: "generated",
      microTask,
      generationSource: "gemini",
      memoryEvidence: { sourceDoneEventId: "done-event-1" },
    });
    const { onStart } = renderModal({ level: 3, skipCount: 5 });

    expect(await screen.findByText(new RegExp(microTask))).toBeInTheDocument();
    expect(screen.getByText(/지난 완료 기록을 참고해/)).toBeInTheDocument();
    expect(
      screen.getByText("Lv3 · 이전 완료 기록 참고"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/그때 이렇게 해서 완료/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

    expect(onStart).toHaveBeenCalledWith({
      entryMode: "intervention",
      entryLevel: 3,
      microTask,
      generationSource: "gemini",
      memoryEvidence: { sourceDoneEventId: "done-event-1" },
    });
  });

  it("근거 없는 Gemini 성공은 맞춤 첫 행동으로 표시하고 그대로 시작한다", async () => {
    const microTask = "문서에 발표 핵심 문장 한 줄 쓰기";
    vi.mocked(requestLv3Microtask).mockResolvedValue({
      status: "generated",
      microTask,
      generationSource: "gemini",
      memoryEvidence: null,
    });
    const { onStart } = renderModal(
      { level: 3, skipCount: 5 },
      {
        lv2MicroTask: "발표 자료에 제목과 목차 3개 적기",
        lv3ReasonChanged: false,
      },
    );

    expect(await screen.findByText(new RegExp(microTask))).toBeInTheDocument();
    expect(screen.getByText("Lv3 · 맞춤 첫 행동")).toBeInTheDocument();
    expect(screen.queryByText(/지난 완료 기록/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));
    expect(onStart).toHaveBeenCalledWith({
      entryMode: "intervention",
      entryLevel: 3,
      microTask,
      generationSource: "gemini",
      memoryEvidence: null,
    });
  });

  it("provider 실패이면 과거 경험을 언급하지 않는 유형별 fallback을 사용한다", async () => {
    vi.mocked(requestLv3Microtask).mockRejectedValue(new Error("timeout"));
    const { onStart } = renderModal({ level: 3, skipCount: 5 });
    const fallback = LV3_SAFE_FALLBACKS["리포트/글쓰기"];

    expect(await screen.findByText(new RegExp(fallback))).toBeInTheDocument();
    expect(screen.queryByText(/지난 완료 기록/)).not.toBeInTheDocument();
    expect(screen.getByText("Lv3 · 강화된 첫 행동")).toBeInTheDocument();
    expect(screen.queryByText(/근거 기반 개입/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        entryLevel: 3,
        microTask: fallback,
        generationSource: "rule_based",
        memoryEvidence: null,
      }),
    );
  });

  it("fallback 확정 후 task 객체가 바뀌어도 재요청하거나 행동을 바꾸지 않는다", async () => {
    vi.mocked(requestLv3Microtask).mockRejectedValue(new Error("timeout"));
    const { rerender } = renderModal({ level: 3, skipCount: 5 });
    const fallback = LV3_SAFE_FALLBACKS["리포트/글쓰기"];

    await screen.findByText(new RegExp(fallback));
    rerender(
      <NudgeModal
        task={{
          ...TASK,
          level: 3,
          skipCount: 9,
          title: "바뀐 제목",
          reason: "dislike",
        }}
        onStart={vi.fn()}
        onClose={vi.fn()}
        checkpointLevel={null}
        onReconfirmReason={vi.fn()}
        onAddToCalendar={vi.fn()}
        completedTasks={[]}
      />,
    );

    expect(requestLv3Microtask).toHaveBeenCalledTimes(1);
    expect(screen.getByText(new RegExp(fallback))).toBeInTheDocument();
  });

  it("이전 레벨의 늦은 성공 응답이 이미 확정된 fallback을 덮지 않는다", async () => {
    let resolveFirstRequest;
    const firstRequest = new Promise((resolve) => {
      resolveFirstRequest = resolve;
    });
    vi.mocked(requestLv3Microtask)
      .mockReturnValueOnce(firstRequest)
      .mockRejectedValueOnce(new Error("timeout"));
    const baseProps = {
      onStart: vi.fn(),
      onClose: vi.fn(),
      checkpointLevel: null,
      onReconfirmReason: vi.fn(),
      onAddToCalendar: vi.fn(),
      completedTasks: [],
    };
    const { rerender } = render(
      <NudgeModal task={{ ...TASK, level: 3 }} {...baseProps} />,
    );

    rerender(<NudgeModal task={{ ...TASK, level: 4 }} {...baseProps} />);
    rerender(<NudgeModal task={{ ...TASK, level: 3 }} {...baseProps} />);
    const fallback = LV3_SAFE_FALLBACKS["리포트/글쓰기"];
    await screen.findByText(new RegExp(fallback));

    await act(async () => {
      resolveFirstRequest({
        status: "generated",
        microTask: "늦게 도착한 목차 한 줄 작성하기",
        generationSource: "gemini",
        memoryEvidence: { sourceDoneEventId: "done-event-late" },
      });
      await firstRequest;
    });

    expect(screen.getByText(new RegExp(fallback))).toBeInTheDocument();
    expect(
      screen.queryByText(/늦게 도착한 목차 한 줄 작성하기/),
    ).not.toBeInTheDocument();
  });

  it("요청 입력에 현재 Task 컨텍스트만 전달한다", async () => {
    vi.mocked(requestLv3Microtask).mockResolvedValue({
      status: "generated",
      microTask: "문서에 핵심 문장 한 줄 쓰기",
      generationSource: "gemini",
      memoryEvidence: null,
    });
    renderModal(
      {
        level: 3,
        reason: "custom",
        customReasonText: "어디서 시작할지 모르겠어요",
      },
      {
        lv2MicroTask: "문서에 제목과 목차 3개 적기",
        lv3ReasonChanged: true,
      },
    );

    await screen.findByText(/문서에 핵심 문장 한 줄 쓰기/);
    expect(requestLv3Microtask).toHaveBeenCalledWith({
      taskId: TASK.id,
      reason: "custom",
      customReason: "어디서 시작할지 모르겠어요",
      reasonChanged: true,
      lv2MicroTask: "문서에 제목과 목차 3개 적기",
      level: 3,
    });
  });

  it("Lv3의 늦은 응답이 다른 레벨 화면을 덮어쓰지 않는다", async () => {
    let resolveRequest;
    const pending = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    vi.mocked(requestLv3Microtask).mockReturnValue(pending);
    const baseProps = {
      onStart: vi.fn(),
      onClose: vi.fn(),
      checkpointLevel: null,
      onReconfirmReason: vi.fn(),
      onAddToCalendar: vi.fn(),
      completedTasks: [],
    };
    const { rerender } = render(
      <NudgeModal task={{ ...TASK, level: 3 }} {...baseProps} />,
    );

    rerender(<NudgeModal task={{ ...TASK, level: 4 }} {...baseProps} />);
    await act(async () => {
      resolveRequest({
        status: "generated",
        microTask: "늦게 도착한 행동 한 줄 작성하기",
        generationSource: "gemini",
        memoryEvidence: { sourceDoneEventId: "done-event-late" },
      });
      await pending;
    });

    expect(
      screen.queryByText(/늦게 도착한 행동 한 줄 작성하기/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/마감이/)).toBeInTheDocument();
  });
});

describe("NudgeModal 레벨별 Focus 컨텍스트", () => {
  beforeEach(() => {
    vi.mocked(requestLv2Microtask).mockReset();
    vi.mocked(requestLv3Microtask).mockReset();
    vi.mocked(requestLv3Microtask).mockRejectedValue(new Error("timeout"));
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

  it(
    "Lv.3 fallback은 전체 메시지가 아니라 분리된 action만 전달한다",
    async () => {
      const level = 3;
      const { onStart } = renderModal({ level, skipCount: level });
      await screen.findByText(
        new RegExp(LV3_SAFE_FALLBACKS["리포트/글쓰기"]),
      );
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

  it("Lv.4는 기존 rule_based action 전달을 유지한다", () => {
    const level = 4;
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
    expect(message).toHaveTextContent(context.microTask);
  });
});
