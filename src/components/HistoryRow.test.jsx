import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HistoryRow from "./HistoryRow.jsx";

describe("HistoryRow completion snapshot", () => {
  it("shows only completion snapshot fields and no current Task metadata", () => {
    render(
      <HistoryRow
        entry={{
          taskId: "task-1",
          title: "테스트 과제",
          completedAt: "2026-07-23T12:34:00.000Z",
          durationSeconds: 125,
          entryLevel: 2,
          microTask: "첫 문장 쓰기",
        }}
        task={{
          skipCount: 0,
          reason: "overwhelm",
        }}
        maxSkip={1}
      />,
    );

    expect(screen.getByText("테스트 과제")).toBeInTheDocument();
    expect(screen.getByText(/완료$/)).toBeInTheDocument();
    expect(screen.getByText("집중 02:05")).toBeInTheDocument();
    expect(screen.getByText("Lv2")).toBeInTheDocument();
    expect(screen.getByText("첫 행동: 첫 문장 쓰기")).toBeInTheDocument();

    expect(screen.queryByText(/회 미룸/)).not.toBeInTheDocument();
    expect(screen.queryByText("한 번에 완료")).not.toBeInTheDocument();
    expect(screen.queryByText("막막하고 부담돼요")).not.toBeInTheDocument();
    expect(document.querySelector(".bar-track")).not.toBeInTheDocument();
    expect(document.querySelector(".bar-fill")).not.toBeInTheDocument();
  });

  it("shows the completion-time reason label when entry.reason is a fixed option (happy path)", () => {
    render(
      <HistoryRow
        entry={{
          taskId: "task-1",
          title: "테스트 과제",
          completedAt: "2026-07-23T12:34:00.000Z",
          durationSeconds: null,
          entryLevel: null,
          microTask: null,
          reason: "overwhelm",
          customReasonText: null,
        }}
      />,
    );

    expect(screen.getByText("막막해서 못 시작")).toBeInTheDocument();
  });

  it("shows the custom reason text when entry.reason is custom (경계)", () => {
    render(
      <HistoryRow
        entry={{
          taskId: "task-1",
          title: "테스트 과제",
          completedAt: "2026-07-23T12:34:00.000Z",
          durationSeconds: null,
          entryLevel: null,
          microTask: null,
          reason: "custom",
          customReasonText: "완벽하게 하고 싶어서",
        }}
      />,
    );

    expect(screen.getByText("완벽하게 하고 싶어서")).toBeInTheDocument();
  });

  it("shows nothing for reason when entry.reason is null (경계)", () => {
    render(
      <HistoryRow
        entry={{
          taskId: "task-1",
          title: "테스트 과제",
          completedAt: "2026-07-23T12:34:00.000Z",
          durationSeconds: null,
          entryLevel: null,
          microTask: null,
          reason: null,
          customReasonText: null,
        }}
      />,
    );

    expect(document.querySelector(".history-reason")).not.toBeInTheDocument();
  });
});
