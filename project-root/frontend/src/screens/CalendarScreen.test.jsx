import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalendarScreen from "./CalendarScreen";
import { fetchCurrentTimetable, shareTimetable } from "../api/timetables";

// shareTimetable은 아직 실제로 존재하지 않지만, outside-in TDD이므로
// "이런 함수가 있다"고 가정하고 화면 쪽 동작부터 먼저 검증한다.
vi.mock("../api/timetables", () => ({
  fetchCurrentTimetable: vi.fn(),
  shareTimetable: vi.fn(),
}));

const mockTimetable = {
  label: "추천 시간표 1",
  lectures: [
    {
      id: 1,
      name: "자료구조",
      professor: "김교수",
      credit: 3,
      category: "전공필수",
      times: [{ day: "화", start: "09:00", end: "10:30" }],
    },
  ],
};

describe("CalendarScreen - 공유하기 버튼", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCurrentTimetable.mockResolvedValue(mockTimetable);
  });

  it("버튼을 누르면 shareTimetable을 호출한다", async () => {
    shareTimetable.mockResolvedValue({});
    const user = userEvent.setup();
    render(<CalendarScreen />);

    const button = await screen.findByRole("button", { name: "이 시간표 공유하기" });
    await user.click(button);

    expect(shareTimetable).toHaveBeenCalledTimes(1);
  });

  it("공유하는 동안에는 버튼이 비활성화되고 문구가 바뀐다", async () => {
    let resolveShare;
    shareTimetable.mockReturnValue(
      new Promise((resolve) => {
        resolveShare = resolve;
      })
    );
    const user = userEvent.setup();
    render(<CalendarScreen />);

    const button = await screen.findByRole("button", { name: "이 시간표 공유하기" });
    await user.click(button);

    const pendingButton = screen.getByRole("button", { name: "공유하는 중..." });
    expect(pendingButton).toBeDisabled();

    resolveShare({});
  });

  it("공유에 성공하면 '공유 완료' 상태로 바뀐다", async () => {
    shareTimetable.mockResolvedValue({});
    const user = userEvent.setup();
    render(<CalendarScreen />);

    const button = await screen.findByRole("button", { name: "이 시간표 공유하기" });
    await user.click(button);

    expect(await screen.findByRole("button", { name: "공유 완료" })).toBeDisabled();
  });

  it("공유에 실패하면 에러 메시지를 보여주고 다시 시도할 수 있다", async () => {
    shareTimetable.mockRejectedValue(new Error("네트워크 오류"));
    const user = userEvent.setup();
    render(<CalendarScreen />);

    const button = await screen.findByRole("button", { name: "이 시간표 공유하기" });
    await user.click(button);

    expect(
      await screen.findByText("시간표 공유에 실패했어요. 잠시 후 다시 시도해주세요.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이 시간표 공유하기" })).toBeEnabled();
  });
});
