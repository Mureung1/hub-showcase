import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskCard from "./TaskCard";

const BASE_TIME = new Date(2026, 6, 24, 12, 0, 0);

function makeTask(overrides = {}) {
  return {
    id: "task-1",
    title: "인공지능수학2",
    type: "문제풀이/암기",
    status: "active",
    level: 2,
    skipCount: 2,
    reason: "overwhelm",
    customReasonText: null,
    startTime: new Date(2026, 6, 24, 15, 0, 0).toISOString(),
    deadline: new Date(2026, 6, 27, 12, 0, 0).toISOString(),
    ...overrides,
  };
}

function renderCard(task) {
  return render(
    <TaskCard task={task} onClick={vi.fn()} onDelete={vi.fn()} />,
  );
}

describe("TaskCard information hierarchy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  it("shows active task context, level, progress, and safe notification status", () => {
    const { container } = renderCard(makeTask());

    expect(screen.getByText("인공지능수학2")).toBeInTheDocument();
    expect(screen.getByText("문제풀이/암기")).toBeInTheDocument();
    expect(screen.getByText("D-3")).toBeInTheDocument();
    expect(screen.getByText("오후 3:00")).toBeInTheDocument();
    expect(screen.getByText("막막해서 못 시작")).toBeInTheDocument();
    expect(screen.getByText(/Lv2/)).toBeInTheDocument();
    expect(screen.getByText("다음 알림 · 자동 예약")).toBeInTheDocument();
    expect(container.querySelector(".pressure-track")).toBeInTheDocument();
  });

  it("shows custom reason text and falls back to 기타 이유 when it is empty", () => {
    const { rerender } = renderCard(
      makeTask({
        reason: "custom",
        customReasonText: "어디서 시작할지 모르겠어요",
      }),
    );
    expect(
      screen.getByText("어디서 시작할지 모르겠어요"),
    ).toBeInTheDocument();

    rerender(
      <TaskCard
        task={makeTask({ reason: "custom", customReasonText: "  " })}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("기타 이유")).toBeInTheDocument();
  });

  it("keeps waiting cards informative without level or notification progress", () => {
    const { container } = renderCard(makeTask({ status: "waiting" }));

    expect(screen.getByText("문제풀이/암기")).toBeInTheDocument();
    expect(screen.getByText("D-3")).toBeInTheDocument();
    expect(screen.getByText("오후 3:00")).toBeInTheDocument();
    expect(screen.getByText("막막해서 못 시작")).toBeInTheDocument();
    expect(screen.queryByText(/Lv2/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("다음 알림 · 자동 예약"),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".pressure-track")).not.toBeInTheDocument();
  });

  it("keeps done cards compact and hides scheduling context", () => {
    const { container } = renderCard(makeTask({ status: "done" }));

    expect(screen.getByText("인공지능수학2")).toBeInTheDocument();
    expect(screen.getByText("문제풀이/암기")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(screen.queryByText("D-3")).not.toBeInTheDocument();
    expect(screen.queryByText("미루는 이유")).not.toBeInTheDocument();
    expect(
      screen.queryByText("다음 알림 · 자동 예약"),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".pressure-track")).not.toBeInTheDocument();
  });
});
