import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MICROTASK_TEMPLATES } from "../lib/microtaskTemplates";
import {
  requestLv2Microtask,
  requestLv3Microtask,
} from "../lib/microtaskApi";
import { LV3_SAFE_FALLBACKS } from "../lib/nudgeMessages";
import NudgeModal, { NUDGE_AUTO_CLOSE_MS } from "./NudgeModal";

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
  const onClose = props.onClose ?? vi.fn();
  const onReconfirmReason =
    props.onReconfirmReason ?? vi.fn();
  const onLv2ActionResolved =
    props.onLv2ActionResolved ?? vi.fn();
  const renderResult = render(
    <NudgeModal
      task={{ ...TASK, ...overrides }}
      onStart={onStart}
      onClose={onClose}
      checkpointLevel={props.checkpointLevel ?? null}
      onReconfirmReason={onReconfirmReason}
      onLv2ActionResolved={onLv2ActionResolved}
      lv2MicroTask={props.lv2MicroTask ?? null}
      lv3ReasonChanged={props.lv3ReasonChanged ?? null}
      completedTasks={[]}
    />,
  );
  return {
    onStart,
    onClose,
    onReconfirmReason,
    onLv2ActionResolved,
    ...renderResult,
  };
}

// "자동 닫힘 00:30"이 라벨/숫자 두 span으로 나뉘어 있어(색상 분리) getByText로 전체
// 문자열을 한 번에 찾을 수 없다 — 컨테이너의 정규화된 textContent로 확인한다.
function getCountdownText() {
  return document
    .querySelector(".nudge-countdown")
    .textContent.replace(/\s+/g, " ")
    .trim();
}

describe("NudgeModal 레벨별 캐릭터 UI", () => {
  beforeEach(() => {
    vi.mocked(requestLv2Microtask).mockReset();
    vi.mocked(requestLv3Microtask).mockReset();
    vi.mocked(requestLv2Microtask).mockResolvedValue({
      microTask: "문서 제목 한 줄 쓰기",
      generationSource: "gemini",
    });
    vi.mocked(requestLv3Microtask).mockRejectedValue(new Error("timeout"));
  });

  it.each([
    [1, "nagbot_lv1.png", "가벼운 알림"],
    [2, "nagbot_lv2.png", "마이크로태스크 제안"],
    [3, "nagbot_lv3.png", "강화된 첫 행동"],
    [4, "nagbot_lv4.png", "마감 임박 경고"],
  ])(
    "Lv%s는 올바른 장식 캐릭터와 텍스트 Badge를 표시한다",
    async (level, fileName, label) => {
      const { container } = renderModal({ level, skipCount: level });

      if (level === 2) {
        await screen.findByText(/문서 제목 한 줄 쓰기/);
      }
      if (level === 3) {
        await screen.findByText(/강화된 첫 행동/);
      }

      const character = container.querySelector(
        `.nudge-character-lv${level}`,
      );
      expect(character).not.toBeNull();
      expect(character).toHaveAttribute("src", expect.stringContaining(fileName));
      expect(character).toHaveAttribute("alt", "");
      expect(character).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    },
  );

  it("기존 이모지 아바타를 렌더링하지 않는다", () => {
    const { container } = renderModal({ level: 1, skipCount: 1 });

    expect(container.querySelector(".nudge-avatar")).toBeNull();
  });
});

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
        journeyLevel: 2,
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
      screen.getByText(/지금 막는 이유부터 다시 확인하자/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/지금 할 수 있는 첫 행동을 찾고 있어요/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이유 확인하고 시작하기" }),
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
      journeyLevel: 3,
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
      journeyLevel: 3,
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

  it("서버가 200 + source:rule_based로 응답하면 서버 microTask를 그대로 표시하고, lv3FallbackRef의 다른 문구는 쓰지 않는다", async () => {
    // 서버가 Gemini 실패 시 자체 규칙 기반 fallback을 200으로 돌려주는 경우 —
    // Promise가 reject되지 않으므로 위 "provider 실패" 테스트(.catch 경로)와는 다른
    // 분기(result.status==="generated" && generationSource==="rule_based")를 검증한다.
    // 서버/클라이언트 fallback 테이블이 어긋나도 화면·Focus·History가 항상 서버 응답
    // 값을 쓰도록, lv3FallbackRef를 다시 계산하지 않고 서버가 준 microTask를 그대로 쓴다.
    const serverMicroTask = "서버 행동";
    vi.mocked(requestLv3Microtask).mockResolvedValue({
      status: "generated",
      microTask: serverMicroTask,
      generationSource: "rule_based",
      memoryEvidence: null,
    });
    const clientFallback = LV3_SAFE_FALLBACKS["리포트/글쓰기"];
    const { onStart } = renderModal({ level: 3, skipCount: 5 });

    expect(await screen.findByText(new RegExp(serverMicroTask))).toBeInTheDocument();
    // 서버/클라이언트 fallback 테이블이 다른 값을 낼 수 있는 상황을 가정 — 클라이언트
    // 테이블의 다른 문구(clientFallback)가 화면에 나타나면 안 된다.
    expect(clientFallback).not.toBe(serverMicroTask);
    expect(screen.queryByText(new RegExp(clientFallback))).not.toBeInTheDocument();
    expect(screen.queryByText(/지난 완료 기록/)).not.toBeInTheDocument();
    expect(screen.getByText("Lv3 · 강화된 첫 행동")).toBeInTheDocument();
    expect(requestLv3Microtask).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        entryLevel: 3,
        microTask: serverMicroTask,
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
    expect(screen.getByText(/생각은 여기까지/)).toBeInTheDocument();
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
      journeyLevel: 1,
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
      // 추천 행동은 이제 .nudge-message가 아니라 .nudge-action-block으로 분리 표시된다
      // (#5 시각 구분) — 둘을 함께 담는 .nudge-body 기준으로 확인한다.
      const message = document.querySelector(".nudge-body");
      expect(message).not.toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

      const context = onStart.mock.calls[0][0];
      expect(context).toMatchObject({
        entryMode: "intervention",
        entryLevel: level,
        journeyLevel: level,
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
    // 추천 행동은 이제 .nudge-message가 아니라 .nudge-action-block으로 분리 표시된다
    // (#5 시각 구분) — 둘을 함께 담는 .nudge-body 기준으로 확인한다.
    const message = document.querySelector(".nudge-body");
    expect(message).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

    const context = onStart.mock.calls[0][0];
    expect(context).toMatchObject({
      entryMode: "intervention",
      entryLevel: level,
      journeyLevel: level,
      generationSource: "rule_based",
      memoryEvidence: null,
    });
    expect(message).toHaveTextContent(context.microTask);
  });

  it("Lv.4도 다른 레벨과 동일하게 지금 시작하기 단일 CTA + X 닫기만 제공한다", () => {
    const onClose = vi.fn();
    const { onStart } = renderModal(
      { level: 4, skipCount: 4 },
      { onClose, checkpointLevel: 3 },
    );

    expect(
      screen.getByRole("button", { name: "지금 시작하기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "나중에" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "캘린더에 추가" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이번 알림 닫기" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });
});

describe("NudgeModal 자동 닫힘 카운트다운", () => {
  beforeEach(() => {
    vi.mocked(requestLv2Microtask).mockReset();
    vi.mocked(requestLv3Microtask).mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("X 버튼은 표시되고, 별도 '나중에' 텍스트 버튼은 없다", () => {
    renderModal({ level: 1, skipCount: 0 });

    expect(
      screen.getByRole("button", { name: "이번 알림 닫기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "나중에" }),
    ).not.toBeInTheDocument();
  });

  it("화면에는 '닫기' 텍스트 없이 X 아이콘만 표시되고, 접근성 이름/title은 유지된다", () => {
    renderModal({ level: 1, skipCount: 0 });

    const closeButton = screen.getByRole("button", { name: "이번 알림 닫기" });
    expect(closeButton).toHaveTextContent("✕");
    expect(closeButton).not.toHaveTextContent("닫기");
    expect(closeButton).toHaveAttribute("title", "이번 알림 닫기");
  });

  it("카운트다운 라벨은 중립색 클래스, 숫자는 Lv 클래스를 사용한다", () => {
    renderModal({ level: 1, skipCount: 0 });

    expect(
      document.querySelector(".nudge-countdown-label"),
    ).toBeInTheDocument();
    expect(
      document.querySelector(".nudge-countdown-value"),
    ).toBeInTheDocument();
  });

  it.each([1, 4])(
    "Lv%s에서도 카운트다운 숫자가 해당 레벨의 --lv 토큰이 적용되는 data-level 안에서 렌더링된다",
    (level) => {
      // Lv2/3는 이 describe의 beforeEach가 requestLv2/3Microtask를 mockReset()만 해둬서
      // (resolvedValue 없음) 비동기 fetch가 섞이므로, 순수 룰베이스인 Lv1/4로 구조만 검증한다.
      renderModal({ level, skipCount: 0 });

      const content = document.querySelector(
        `.nudge-content[data-level="${level}"]`,
      );
      expect(content).toBeInTheDocument();
      expect(
        content.querySelector(".nudge-countdown-value"),
      ).toBeInTheDocument();
    },
  );

  it("자동 닫힘 00:30부터 시작하고, 1초 후 00:29로 갱신된다", () => {
    renderModal({ level: 1, skipCount: 0 });

    expect(getCountdownText()).toBe("자동 닫힘 00:30");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getCountdownText()).toBe("자동 닫힘 00:29");
  });

  it("30초가 지나면 자동으로 onClose가 호출된다(모달 닫힘)", () => {
    const { onClose } = renderModal({ level: 1, skipCount: 0 });

    act(() => {
      vi.advanceTimersByTime(NUDGE_AUTO_CLOSE_MS);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("자동 종료 시 새로운 API 요청(skipCount 증가·notification_sent 등)을 전혀 만들지 않는다", () => {
    renderModal({ level: 1, skipCount: 0 });

    act(() => {
      vi.advanceTimersByTime(NUDGE_AUTO_CLOSE_MS);
    });

    // 모달 자체는 API를 직접 호출하지 않는다 — Lv2/Lv3 생성 요청만 감시 대상이며,
    // Lv1은 애초에 호출하지 않으므로 "추가로 발생하지 않았다"를 0회로 확인한다.
    expect(requestLv2Microtask).not.toHaveBeenCalled();
    expect(requestLv3Microtask).not.toHaveBeenCalled();
  });

  it("자동 종료 시 Focus 진입 콜백(onStart)이 호출되지 않는다", () => {
    const { onStart } = renderModal({ level: 1, skipCount: 0 });

    act(() => {
      vi.advanceTimersByTime(NUDGE_AUTO_CLOSE_MS);
    });

    expect(onStart).not.toHaveBeenCalled();
  });

  it("이유를 선택해도 카운트다운이 멈추거나 30초로 초기화되지 않는다", () => {
    renderModal(
      { level: 1, skipCount: 0 },
      { checkpointLevel: 1 },
    );

    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(getCountdownText()).toBe("자동 닫힘 00:22");

    fireEvent.click(screen.getByRole("button", { name: "막막해서 못 시작" }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(getCountdownText()).toBe("자동 닫힘 00:21");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(getCountdownText()).toBe("자동 닫힘 00:20");
  });

  it("나중에(X) 클릭 시 즉시 닫히고 Focus 콜백은 호출되지 않는다", () => {
    const { onClose, onStart } = renderModal({ level: 1, skipCount: 0 });

    fireEvent.click(screen.getByRole("button", { name: "이번 알림 닫기" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();

    // 닫힌 뒤 시간이 더 지나도 onClose가 추가로 호출되지 않는다(정리 확인).
    act(() => {
      vi.advanceTimersByTime(NUDGE_AUTO_CLOSE_MS);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("지금 시작하기 클릭 시 기존 Focus 값이 그대로 전달되고, 이후 타이머가 추가로 실행되지 않는다", () => {
    const { onStart, onClose, unmount } = renderModal(
      { level: 1, skipCount: 0 },
      {},
    );

    fireEvent.click(screen.getByRole("button", { name: "지금 시작하기" }));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        entryMode: "intervention",
        entryLevel: 1,
        journeyLevel: 1,
        generationSource: "none",
      }),
    );

    // 실제 앱에서는 onStart 직후 부모가 모달을 unmount한다 — 여기서도 동일하게
    // unmount해 interval cleanup을 검증하고, 이후 시간 경과로 onClose가 추가
    // 호출되지 않는지 확인한다.
    unmount();
    act(() => {
      vi.advanceTimersByTime(NUDGE_AUTO_CLOSE_MS);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("unmount 후에는 자동 닫힘 timer callback이 실행되지 않는다", () => {
    const { onClose, unmount } = renderModal({ level: 1, skipCount: 0 });

    unmount();

    act(() => {
      vi.advanceTimersByTime(NUDGE_AUTO_CLOSE_MS);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("React StrictMode에서도 자동 닫힘 interval이 중복되지 않는다(30초에 정확히 1번만 호출)", () => {
    const onClose = vi.fn();
    render(
      <StrictMode>
        <NudgeModal
          task={{ ...TASK, level: 1, skipCount: 0 }}
          onStart={vi.fn()}
          onClose={onClose}
          checkpointLevel={null}
          onReconfirmReason={vi.fn()}
          completedTasks={[]}
        />
      </StrictMode>,
    );

    act(() => {
      vi.advanceTimersByTime(NUDGE_AUTO_CLOSE_MS);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
