import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TaskCard from "./TaskCard";

const BASE_TIME = new Date("2026-07-24T03:00:00.000Z");

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "인공지능수학 과제",
    type: "문제풀이/암기",
    status: "active",
    level: 2,
    skipCount: 2,
    reason: "overwhelm",
    customReasonText: null,
    startTime: "2026-07-24T06:00:00.000Z",
    deadline: "2026-07-27T03:00:00.000Z",
    ...overrides,
  };
}

function renderCard(task, props = {}) {
  const onClick = props.onClick ?? vi.fn();
  const onDelete = props.onDelete ?? vi.fn();
  const result = render(
    <TaskCard
      task={task}
      onClick={onClick}
      onDelete={onDelete}
      now={BASE_TIME}
      isNudgeModalOpen={props.isNudgeModalOpen}
      isThisTaskModalTarget={props.isThisTaskModalTarget}
      isFocused={props.isFocused}
      nextNudgeAt={props.nextNudgeAt}
    />,
  );
  return { ...result, onClick, onDelete };
}

describe("TaskCard redesign", () => {
  it("active 카드는 맥락과 명시적인 시작 액션을 표시한다", () => {
    const { container } = renderCard(makeTask());

    expect(screen.getByText("인공지능수학 과제")).toBeInTheDocument();
    expect(screen.getByText("문제풀이/암기")).toBeInTheDocument();
    expect(screen.getByText("7월 27일 · D-3")).toBeInTheDocument();
    expect(screen.getByText("오늘 오후 3:00")).toBeInTheDocument();
    expect(
      screen.getByText("막막해서 못 시작해서 미루고 있어요."),
    ).toBeInTheDocument();
    expect(screen.queryByText("미루는 이유")).toBeNull();
    expect(screen.getAllByText(/Lv2/)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "지금 시작" })).toBeEnabled();
    expect(container.querySelector(".pressure-track")).toBeInTheDocument();
  });

  it.each([1, 2, 3, 4])(
    "Lv%s Badge와 진행바에 같은 레벨 체계를 적용한다",
    (level) => {
      const { container } = renderCard(makeTask({ level }));

      expect(
        container.querySelector(`.task-level-badge[data-level="${level}"]`),
      ).toBeInTheDocument();
      expect(
        container.querySelector(`.pressure-fill-lv${level}`),
      ).toHaveStyle({ width: `${(level / 4) * 100}%` });
      expect(
        screen.getByRole("progressbar", { name: `개입 레벨 ${level}` }),
      ).toHaveAttribute("aria-valuenow", String(level));
    },
  );

  it("알림 상태와 지금 시작 버튼을 같은 action row에 둔다", () => {
    const { container } = renderCard(makeTask());
    const actions = container.querySelector(".task-card-actions");

    expect(actions).toContainElement(screen.getByText("다음 알림 · 자동 예약"));
    expect(actions).toContainElement(
      screen.getByRole("button", { name: "지금 시작" }),
    );
  });

  it("카드 전체가 아니라 지금 시작 버튼만 direct Focus를 시작한다", () => {
    const { container, onClick } = renderCard(makeTask());

    fireEvent.click(container.querySelector(".task-card"));
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "지금 시작" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("waiting 카드는 시작 버튼과 개입 진행 정보를 표시하지 않는다", () => {
    const { container } = renderCard(makeTask({ status: "waiting" }));

    expect(screen.getByText("시작 예정")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지금 시작" })).toBeNull();
    expect(screen.queryByText(/Lv2/)).toBeNull();
    expect(container.querySelector(".pressure-track")).toBeNull();
  });

  it("done 카드는 낮은 대비의 간결한 완료 정보만 유지한다", () => {
    const { container } = renderCard(makeTask({ status: "done" }));

    expect(container.querySelector(".task-card.done")).toBeInTheDocument();
    expect(screen.getByText("인공지능수학 과제")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(screen.getByText("문제풀이/암기")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "지금 시작" })).toBeNull();
    expect(screen.queryByLabelText(/마감/)).toBeNull();
  });

  it.each([
    ["2026-07-24T02:59:59.999Z", "기한 초과"],
    ["2026-07-24T12:00:00.000Z", "오늘 마감"],
    ["2026-07-25T12:00:00.000Z", "내일 마감"],
  ])("deadline %s를 %s로 표시한다", (deadline, label) => {
    renderCard(makeTask({ deadline }));
    expect(screen.getByLabelText(`마감 ${label}`)).toBeInTheDocument();
  });

  it.each([null, undefined, "", "invalid-date"])(
    "잘못되거나 누락된 deadline %s에는 마감 Badge를 표시하지 않는다",
    (deadline) => {
      renderCard(makeTask({ deadline }));

      expect(screen.queryByLabelText(/마감/)).toBeNull();
      expect(screen.getByText("인공지능수학 과제")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "지금 시작" })).toBeEnabled();
    },
  );

  it("모바일용 짧은 날짜 표현도 함께 제공한다", () => {
    renderCard(makeTask());
    expect(screen.getByText("7/27 · D-3")).toBeInTheDocument();
  });

  it("삭제 버튼은 명확한 접근성 이름을 가지며 시작 액션을 실행하지 않는다", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onClick, onDelete } = renderCard(makeTask());

    fireEvent.click(
      screen.getByRole("button", { name: "인공지능수학 과제 삭제" }),
    );

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("긴 제목과 custom 이유도 손실 없이 렌더링한다", () => {
    const title =
      "아주 긴 태스크 제목이 카드 너비를 넘더라도 내용이 사라지지 않아야 하는 발표 자료 작성";
    const customReasonText = "어디서 시작해야 할지 아직 구체적으로 모르겠어요";
    renderCard(
      makeTask({ title, reason: "custom", customReasonText }),
    );

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(customReasonText)).toBeInTheDocument();
  });

  it("시스템 회피 이유만 자연스러운 문장으로 표시한다", () => {
    const { rerender } = renderCard(makeTask({ reason: "dislike" }));
    expect(
      screen.getByText("할 일 자체가 하기 싫어서 미루고 있어요."),
    ).toBeInTheDocument();

    rerender(
      <TaskCard
        task={makeTask({ reason: "temptation" })}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        now={BASE_TIME}
      />,
    );
    expect(
      screen.getByText("다른 유혹에 끌려서 미루고 있어요."),
    ).toBeInTheDocument();
  });

  it("알 수 없는 이유 값은 의미를 추측하지 않고 원문을 유지한다", () => {
    renderCard(makeTask({ reason: "새로운 이유 원문" }));
    expect(screen.getByText("새로운 이유 원문")).toBeInTheDocument();
  });
});

describe("TaskCard 다음 알림 카운트다운", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1분 이상 남았을 때 MM:SS로 표시한다", () => {
    const nextNudgeAt = BASE_TIME.getTime() + 4 * 60 * 1000 + 32 * 1000;
    renderCard(makeTask(), { nextNudgeAt });

    expect(screen.getByText("다음 알림까지 04:32")).toBeInTheDocument();
  });

  it("6~59초 남았을 때 N초로 표시한다", () => {
    const nextNudgeAt = BASE_TIME.getTime() + 42 * 1000;
    renderCard(makeTask(), { nextNudgeAt });

    expect(screen.getByText("다음 알림까지 42초")).toBeInTheDocument();
  });

  it("5초 이하로 남았을 때 '곧 다시 알려드릴게요'를 표시한다", () => {
    const nextNudgeAt = BASE_TIME.getTime() + 3 * 1000;
    renderCard(makeTask(), { nextNudgeAt });

    expect(screen.getByText("곧 다시 알려드릴게요")).toBeInTheDocument();
  });

  it("시간이 흐르면 문구가 정상적으로 갱신된다", () => {
    const nextNudgeAt = BASE_TIME.getTime() + 8 * 1000;
    renderCard(makeTask(), { nextNudgeAt });

    expect(screen.getByText("다음 알림까지 8초")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("다음 알림까지 7초")).toBeInTheDocument();
  });

  it("여러 Task가 있을 때 각 카드가 자기 남은 시간을 표시한다", () => {
    const taskA = makeTask({ id: "task-a", title: "과제 A" });
    const taskB = makeTask({ id: "task-b", title: "과제 B" });
    const { rerender } = render(
      <>
        <TaskCard
          task={taskA}
          onClick={vi.fn()}
          onDelete={vi.fn()}
          now={BASE_TIME}
          nextNudgeAt={BASE_TIME.getTime() + 30 * 1000}
        />
        <TaskCard
          task={taskB}
          onClick={vi.fn()}
          onDelete={vi.fn()}
          now={BASE_TIME}
          nextNudgeAt={BASE_TIME.getTime() + 5 * 60 * 1000}
        />
      </>,
    );

    expect(screen.getByText("다음 알림까지 30초")).toBeInTheDocument();
    expect(screen.getByText("다음 알림까지 05:00")).toBeInTheDocument();
    rerender(<></>);
  });

  it("이 Task의 모달이 열려 있으면 '알림 확인 중'을 표시한다", () => {
    renderCard(makeTask(), {
      isNudgeModalOpen: true,
      isThisTaskModalTarget: true,
      nextNudgeAt: BASE_TIME.getTime() + 60 * 1000,
    });

    expect(screen.getByText("알림 확인 중")).toBeInTheDocument();
    expect(screen.queryByText(/다음 알림까지/)).not.toBeInTheDocument();
  });

  it("다른 Task의 모달이 열려 있으면 '다른 알림 확인 중'을 표시한다", () => {
    renderCard(makeTask(), {
      isNudgeModalOpen: true,
      isThisTaskModalTarget: false,
      nextNudgeAt: BASE_TIME.getTime() + 60 * 1000,
    });

    expect(screen.getByText("다른 알림 확인 중")).toBeInTheDocument();
    expect(screen.queryByText(/다음 알림까지/)).not.toBeInTheDocument();
  });

  it("Focus 중인 Task는 '집중 중에는 알림이 멈춰요'를 표시한다", () => {
    renderCard(makeTask(), {
      isFocused: true,
      nextNudgeAt: BASE_TIME.getTime() + 60 * 1000,
    });

    expect(
      screen.getByText("집중 중에는 알림이 멈춰요"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/다음 알림까지/)).not.toBeInTheDocument();
  });

  it("완료된 Task 카드에는 카운트다운을 표시하지 않는다", () => {
    renderCard(makeTask({ status: "done" }), {
      nextNudgeAt: BASE_TIME.getTime() + 60 * 1000,
    });

    expect(screen.queryByText(/다음 알림까지/)).not.toBeInTheDocument();
    expect(screen.queryByText("알림 확인 중")).not.toBeInTheDocument();
  });

  it("waiting(알림 대상 아님) Task 카드에는 카운트다운을 표시하지 않는다", () => {
    renderCard(makeTask({ status: "waiting" }), {
      nextNudgeAt: BASE_TIME.getTime() + 60 * 1000,
    });

    expect(screen.queryByText(/다음 알림까지/)).not.toBeInTheDocument();
  });

  it("nextNudgeAt 데이터가 없어도(null) UI가 깨지지 않고 기본 문구를 보여준다", () => {
    renderCard(makeTask(), { nextNudgeAt: null });

    expect(screen.getByText("다음 알림 · 자동 예약")).toBeInTheDocument();
  });

  it("모달이 닫혀 카운트다운이 다시 보일 때, 모달이 열려 있던 동안 멈춰 있던 시각으로 부풀려진 값을 먼저 보여주지 않는다", () => {
    const task = makeTask();
    const { rerender } = render(
      <TaskCard
        task={task}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        now={BASE_TIME}
        isNudgeModalOpen={false}
        isThisTaskModalTarget={false}
        nextNudgeAt={BASE_TIME.getTime() + 10 * 1000}
      />,
    );
    expect(screen.getByText("다음 알림까지 10초")).toBeInTheDocument();

    // 모달이 열림: 카운트다운이 마스킹되고, 그동안 실제 시간은 6초 흐른다
    // (실 서비스에서는 넛지 확인/자동 닫힘 등으로 이 구간이 수 초~30초까지 걸릴 수 있다).
    rerender(
      <TaskCard
        task={task}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        now={BASE_TIME}
        isNudgeModalOpen={true}
        isThisTaskModalTarget={true}
        nextNudgeAt={null}
      />,
    );
    expect(screen.getByText("알림 확인 중")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // 모달이 닫힘: HomePage가 이 시점 기준으로 새 nextNudgeAt(27초 뒤)을 예약한다.
    rerender(
      <TaskCard
        task={task}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        now={BASE_TIME}
        isNudgeModalOpen={false}
        isThisTaskModalTarget={false}
        nextNudgeAt={Date.now() + 27 * 1000}
      />,
    );

    // 부풀려진 값(예: 33초, = 옛 now 기준)이 아니라 정확한 27초부터 보여야 한다.
    expect(screen.getByText("다음 알림까지 27초")).toBeInTheDocument();
    expect(screen.queryByText("다음 알림까지 33초")).not.toBeInTheDocument();
  });
});

describe("TaskCard Lv별 얼굴 아이콘", () => {
  it.each([1, 2, 3, 4])("Lv%s Task는 nagbot_face_lv%s 이미지를 사용한다", (level) => {
    const { container } = renderCard(makeTask({ level }));

    const face = container.querySelector(".task-face-img");
    expect(face).toBeInTheDocument();
    expect(face.getAttribute("src")).toContain(`nagbot_face_lv${level}`);
  });

  it("얼굴은 원형 프레임(.task-face) wrapper 안에 렌더링되고, 프레임엔 별도 배경 이미지 레이어가 있다", () => {
    const { container } = renderCard(makeTask({ level: 2 }));

    const frame = container.querySelector(".task-face");
    expect(frame).toBeInTheDocument();
    expect(frame.querySelector(".task-face-circle")).toBeInTheDocument();
    expect(frame.querySelector(".task-face-img")).toBeInTheDocument();
  });

  it("원형 프레임에는 Lv별 색상 배경/데이터 속성이 없다(레벨 색은 배지·얼굴 표정으로만 표현)", () => {
    const { container } = renderCard(makeTask({ level: 3 }));

    const frame = container.querySelector(".task-face");
    const circle = container.querySelector(".task-face-circle");
    expect(frame).not.toHaveAttribute("data-level");
    expect(circle).not.toHaveAttribute("data-level");
    expect(circle.className).not.toMatch(/lv\d/i);
  });

  it("얼굴 이미지는 장식 목적이라 alt가 비어 있고 aria-hidden 처리된다", () => {
    const { container } = renderCard(makeTask({ level: 1 }));

    const face = container.querySelector(".task-face-img");
    expect(face).toHaveAttribute("alt", "");
    expect(face).toHaveAttribute("aria-hidden", "true");
  });

  it.each([0, 5, null, undefined, "2", -1])(
    "level이 없거나 유효하지 않으면(%s) lv0 얼굴로 안전하게 fallback한다",
    (level) => {
      const { container } = renderCard(makeTask({ level }));

      const face = container.querySelector(".task-face-img");
      expect(face.getAttribute("src")).toContain("nagbot_face_lv0");
    },
  );

  it("진행 중 Task 카드에는 얼굴이 표시된다", () => {
    const { container } = renderCard(makeTask({ status: "active" }));
    expect(container.querySelector(".task-face")).toBeInTheDocument();
  });

  it("완료 Task 카드에는 얼굴을 표시하지 않는다", () => {
    const { container } = renderCard(makeTask({ status: "done" }));
    expect(container.querySelector(".task-face")).not.toBeInTheDocument();
  });

  it("waiting Task 카드에도 얼굴을 표시하지 않는다", () => {
    const { container } = renderCard(makeTask({ status: "waiting" }));
    expect(container.querySelector(".task-face")).not.toBeInTheDocument();
  });

  it("얼굴이 추가돼도 삭제·지금 시작 이벤트는 정상 동작한다", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onClick, onDelete } = renderCard(makeTask({ level: 4 }));

    fireEvent.click(screen.getByRole("button", { name: "지금 시작" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "인공지능수학 과제 삭제" }),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);

    confirm.mockRestore();
  });

  it("얼굴 아이콘이 제목보다 먼저 DOM에 오지만 제목과 같은 행에 있어 카드 높이를 늘리지 않는다", () => {
    const { container } = renderCard(makeTask());
    const row = container.querySelector(".task-title-row");

    expect(row).toBeInTheDocument();
    expect(row.querySelector(".task-face")).toBeInTheDocument();
    expect(row.querySelector(".task-title")).toBeInTheDocument();
  });
});
