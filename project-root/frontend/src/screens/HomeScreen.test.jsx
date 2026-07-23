import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomeScreen from "./HomeScreen";
import { fetchSharedTimetables, recommendTimetable } from "../api/timetables";

// fetchSharedTimetables는 아직 없지만, outside-in TDD이므로 화면 쪽부터 먼저 만든다.
vi.mock("../api/timetables", () => ({
  fetchSharedTimetables: vi.fn(),
  recommendTimetable: vi.fn(),
}));

const mockShared = [
  {
    id: 1,
    label: "추천 시간표 1",
    recommendCount: 12,
    recommendedByMe: false,
    lectures: [
      {
        id: 101,
        name: "자료구조",
        professor: "김구진",
        credit: 3,
        category: "전공필수",
        times: [{ day: "화", start: "09:00", end: "10:30" }],
      },
    ],
  },
  {
    id: 2,
    label: "추천 시간표 2",
    recommendCount: 3,
    recommendedByMe: true,
    lectures: [
      {
        id: 102,
        name: "확률및통계",
        professor: "이교수",
        credit: 3,
        category: "교양",
        times: [{ day: "수", start: "13:00", end: "14:30" }],
      },
    ],
  },
];

describe("HomeScreen - 선배 시간표 공유 목록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSharedTimetables.mockResolvedValue(mockShared);
  });

  it("실제로 공유된 시간표 목록을 불러와 보여준다", async () => {
    render(<HomeScreen />);

    expect(await screen.findByText("추천 시간표 1")).toBeInTheDocument();
    expect(screen.getByText("추천 시간표 2")).toBeInTheDocument();
    expect(screen.getByText("자료구조")).toBeInTheDocument();
  });

  it("공유된 시간표가 없으면 안내 문구를 보여준다", async () => {
    fetchSharedTimetables.mockResolvedValue([]);
    render(<HomeScreen />);

    expect(await screen.findByText("아직 공유된 선배 시간표가 없어요")).toBeInTheDocument();
  });

  it("목록을 불러오지 못하면 에러 문구를 보여준다", async () => {
    fetchSharedTimetables.mockRejectedValue(new Error("네트워크 오류"));
    render(<HomeScreen />);

    expect(
      await screen.findByText("선배 시간표를 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
    ).toBeInTheDocument();
  });
});

describe("HomeScreen - 선배 시간표 추천하기 버튼", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSharedTimetables.mockResolvedValue(mockShared);
  });

  it("아직 추천 안 한 카드는 추천하기 버튼이 활성화돼 있고, 누르면 recommendTimetable(id)을 호출한다", async () => {
    recommendTimetable.mockResolvedValue({ recommendCount: 13 });
    const user = userEvent.setup();
    render(<HomeScreen />);

    const button = await screen.findByRole("button", { name: "추천하기" });
    await user.click(button);

    expect(recommendTimetable).toHaveBeenCalledWith({ timetableId: 1 });
  });

  it("이미 추천한 카드는 처음부터 '추천 완료'로 비활성화돼 있다", async () => {
    render(<HomeScreen />);

    expect(await screen.findByRole("button", { name: "추천 완료" })).toBeDisabled();
  });

  it("추천에 성공하면 카운트가 올라가고 버튼이 비활성화된다", async () => {
    recommendTimetable.mockResolvedValue({ recommendCount: 13 });
    const user = userEvent.setup();
    render(<HomeScreen />);

    const button = await screen.findByRole("button", { name: "추천하기" });
    await user.click(button);

    await screen.findByText("추천 13");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("추천 완료");
  });

  it("추천에 실패하면 버튼이 다시 활성화되고 카운트는 그대로다", async () => {
    recommendTimetable.mockRejectedValue(new Error("네트워크 오류"));
    const user = userEvent.setup();
    render(<HomeScreen />);

    const button = await screen.findByRole("button", { name: "추천하기" });
    await user.click(button);

    await screen.findByText("추천 12");
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent("추천하기");
  });
});
