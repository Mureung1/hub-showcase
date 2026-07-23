import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PreferenceScreen from "./PreferenceScreen";
import { fetchLectures } from "../api/lectures";
import { parseFreeTextConditions } from "../api/preferences";

// parseFreeTextConditions는 아직 없지만, outside-in TDD이므로 화면 쪽부터 먼저 만든다.
vi.mock("../api/lectures", () => ({
  fetchLectures: vi.fn(),
}));
vi.mock("../api/preferences", () => ({
  parseFreeTextConditions: vi.fn(),
}));

describe("PreferenceScreen - AI로 조건 분석하기", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchLectures.mockResolvedValue([]);
  });

  it("자유 텍스트가 비어있으면 분석 버튼이 비활성화돼 있다", async () => {
    render(<PreferenceScreen />);

    const button = await screen.findByRole("button", { name: "AI로 조건 분석하기" });
    expect(button).toBeDisabled();
  });

  it("자유 텍스트를 입력하고 누르면 parseFreeTextConditions를 호출한다", async () => {
    parseFreeTextConditions.mockResolvedValue({
      freeDays: [],
      avoidMorning: null,
      targetCredit: null,
      teamPreferred: null,
    });
    const user = userEvent.setup();
    render(<PreferenceScreen />);

    const textarea = await screen.findByLabelText("자유 텍스트 조건 (선택)");
    await user.type(textarea, "수요일엔 오후 수업만 듣고 싶어요");
    await user.click(screen.getByRole("button", { name: "AI로 조건 분석하기" }));

    expect(parseFreeTextConditions).toHaveBeenCalledWith("수요일엔 오후 수업만 듣고 싶어요");
  });

  it("분석에 성공하면 해당 폼 필드가 업데이트된다", async () => {
    parseFreeTextConditions.mockResolvedValue({
      freeDays: ["수"],
      avoidMorning: true,
      targetCredit: 18,
      teamPreferred: true,
    });
    const user = userEvent.setup();
    render(<PreferenceScreen />);

    const textarea = await screen.findByLabelText("자유 텍스트 조건 (선택)");
    await user.type(textarea, "수요일 공강, 오전 수업 싫고 18학점, 팀플 있는 수업 선호");
    await user.click(screen.getByRole("button", { name: "AI로 조건 분석하기" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "수" })).toHaveClass("chip--active");
    });
    expect(screen.getByRole("button", { name: "18학점" })).toHaveClass("chip--active");

    const morningRow = screen.getByText("오전 수업 피하기").closest(".field--row");
    expect(within(morningRow).getByRole("button")).toHaveAttribute("aria-pressed", "true");

    const teamRow = screen.getByText("팀플 있는 수업 선호").closest(".field--row");
    expect(within(teamRow).getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("분석에 실패하면 에러 문구를 보여준다", async () => {
    parseFreeTextConditions.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    render(<PreferenceScreen />);

    const textarea = await screen.findByLabelText("자유 텍스트 조건 (선택)");
    await user.type(textarea, "아무 텍스트");
    await user.click(screen.getByRole("button", { name: "AI로 조건 분석하기" }));

    expect(
      await screen.findByText("조건을 분석하지 못했어요. 잠시 후 다시 시도해주세요.")
    ).toBeInTheDocument();
  });
});
