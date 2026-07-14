import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function completeForm(title = "Blue") {
  fireEvent.change(screen.getByLabelText("노래 제목"), { target: { value: title } });
  fireEvent.change(screen.getByLabelText("아티스트명"), { target: { value: "Joni Mitchell" } });
  fireEvent.change(screen.getByLabelText("한 줄로 남기기"), { target: { value: "오늘을 천천히 기억하는 노래." } });
}

describe("music record flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T10:00:00+09:00"));
  });

  afterEach(() => vi.useRealTimers());

  it("shows today without a date input", () => {
    render(<App initialRecords={[]} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText(/2026년 7월 15일 수요일/)).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument();
  });

  it("renders an intentional empty state", () => {
    render(<App initialRecords={[]} />);
    expect(screen.getByText("아직 기록된 음악이 없어요.")).toBeInTheDocument();
  });

  it("shows validation only for music and emotion", () => {
    render(<App initialRecords={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    expect(screen.getByText("노래 제목을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("아티스트명을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("한 줄 감정을 입력해주세요.")).toBeInTheDocument();
  });

  it("adds today's record and allows liking it", () => {
    render(<App initialRecords={[]} />);
    completeForm();
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));

    expect(screen.getByRole("heading", { name: "Blue" })).toBeInTheDocument();
    expect(screen.getByText("2026년 7월 15일")).toBeInTheDocument();
    const likeButton = screen.getByRole("button", { name: "Blue 좋아요" });
    fireEvent.click(likeButton);
    expect(screen.getByRole("button", { name: "Blue 좋아요 취소" })).toHaveAttribute("aria-pressed", "true");
  });

  it("replaces the existing record when saving again today", () => {
    render(<App initialRecords={[]} />);
    completeForm("Blue");
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));
    completeForm("River");
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));

    expect(screen.queryByRole("heading", { name: "Blue" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "River" })).toBeInTheDocument();
    expect(screen.getByText("오늘의 기록을 수정했어요.")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});
