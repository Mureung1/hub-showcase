import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReactBasicsLessonPage from "./ReactBasicsLessonPage";

const lessonData = {
  title: "mock fetch 결과",
  summary: "fetch로 데이터를 가져오면, 화면은 로딩 상태와 완료 상태를 구분해서 그릴 수 있습니다.",
  cards: [
    {
      tag: "컴포넌트",
      title: "작은 화면 조각으로 나누기",
      description: "헤더, 본문, 요약처럼 역할이 다른 영역은 컴포넌트로 분리해야 구조가 읽기 쉬워집니다.",
    },
    {
      tag: "state",
      title: "화면의 현재값을 저장하기",
      description: "입력값, 선택 상태, 열림 여부 같은 값은 state로 관리하면 리렌더링 흐름을 이해하기 쉽습니다.",
    },
    {
      tag: "fetch",
      title: "외부 데이터를 연결하기",
      description: "fetch는 데이터를 가져오는 책임만 맡기고, 가져온 결과를 렌더링하는 책임은 컴포넌트에 둡니다.",
    },
  ],
  fetchNotes: [
    "로딩 중에는 안내 문구를 먼저 보여준다.",
    "응답이 오면 데이터 구조를 화면에 맞게 렌더링한다.",
    "실패하면 다시 불러오기 버튼을 둔다.",
  ],
};

describe("ReactBasicsLessonPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads mock data, updates state, and lets the user add notes", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => lessonData,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ReactBasicsLessonPage />);

    expect(screen.getByText("데이터를 불러오는 중입니다.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "React 핵심 화면 만들기" })).toBeInTheDocument();
    expect(await screen.findByText(lessonData.title)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "작은 화면 조각으로 나누기" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /상태/ }));
    expect(screen.getByRole("heading", { name: "화면의 현재값을 저장하기" })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("오늘 손코딩할 한 줄을 적어보세요"), "컴포넌트부터 손으로 쪼개기");
    await user.click(screen.getByRole("button", { name: "메모 추가" }));
    expect(screen.getByText("컴포넌트부터 손으로 쪼개기")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
