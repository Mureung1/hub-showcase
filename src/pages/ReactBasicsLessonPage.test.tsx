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

const quizData = [
  {
    id: 1,
    question: "React에서 컴포넌트의 상태(State)와 속성(Props)의 가장 큰 차이점은 무엇일까요?",
    options: [
      "State는 컴포넌트 내부에서 변경 가능하지만, Props는 외부에서 전달받아 읽기 전용으로 사용됩니다.",
      "Props는 내부에서 변경 가능하며, State는 상위 컴포넌트에서 전달받습니다.",
      "둘 다 완전히 동일한 개념이며 이름만 다릅니다."
    ],
    correctIndex: 0,
    explanation: "State는 컴포넌트 자체적으로 관리하고 업데이트하는 동적 데이터이고, Props는 부모 컴포넌트로부터 자식 컴포넌트로 전달되는 불변의 속성값입니다."
  }
];

const schemaData = [
  {
    table: "lessons",
    description: "학습 과제 및 실습 단계 메타데이터",
    columns: [
      { name: "id", type: "UUID", key: "PK", desc: "과제 고유 식별자" }
    ]
  }
];

describe("ReactBasicsLessonPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads mock data, updates state, and lets the user add and delete notes", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("lesson-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => lessonData,
        });
      }
      if (url.includes("quiz-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => quizData,
        });
      }
      if (url.includes("schema-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => schemaData,
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ReactBasicsLessonPage />);

    expect(screen.getByText("데이터를 불러오는 중입니다.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "React 핵심 화면 만들기" })).toBeInTheDocument();
    expect(await screen.findByText(lessonData.title)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "작은 화면 조각으로 나누기" })).toBeInTheDocument();

    // Test card selection
    await user.click(screen.getByRole("button", { name: /상태/ }));
    expect(screen.getByRole("heading", { name: "화면의 현재값을 저장하기" })).toBeInTheDocument();

    // Test note addition
    await user.type(screen.getByPlaceholderText("오늘 손코딩할 한 줄을 적어보세요"), "컴포넌트부터 손으로 쪼개기");
    await user.click(screen.getByRole("button", { name: "메모 추가" }));
    expect(screen.getByText("컴포넌트부터 손으로 쪼개기")).toBeInTheDocument();

    // Test note deletion (using callback)
    const deleteButtons = screen.getAllByRole("button", { name: "메모 삭제" });
    await user.click(deleteButtons[0]);
    expect(screen.queryByText("컴포넌트부터 손으로 쪼개기")).not.toBeInTheDocument();

    // Test page reload
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await waitFor(() => {
      const lessonCalls = fetchMock.mock.calls.filter(call => call[0].includes("lesson-data.json"));
      expect(lessonCalls.length).toBe(2);
    });
  });

  it("switches to quiz view, allows selecting answers, and displays explanation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("lesson-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => lessonData,
        });
      }
      if (url.includes("quiz-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => quizData,
        });
      }
      if (url.includes("schema-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => schemaData,
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ReactBasicsLessonPage />);

    // Wait for initial load
    await screen.findByText(lessonData.title);

    // Switch to quiz tab
    await user.click(screen.getByRole("button", { name: "자가 진단 퀴즈" }));

    // Verify quiz question is loaded
    expect(await screen.findByText("Q1. React에서 컴포넌트의 상태(State)와 속성(Props)의 가장 큰 차이점은 무엇일까요?")).toBeInTheDocument();

    // Answer the quiz
    const correctAnswerOption = screen.getByRole("button", { name: /1\. State는 컴포넌트 내부에서/ });
    await user.click(correctAnswerOption);

    // Verify correct explanation shows
    expect(screen.getByText("State는 컴포넌트 자체적으로 관리하고 업데이트하는 동적 데이터이고, Props는 부모 컴포넌트로부터 자식 컴포넌트로 전달되는 불변의 속성값입니다.")).toBeInTheDocument();
  });

  it("switches to schema view and displays designed database tables", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("lesson-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => lessonData,
        });
      }
      if (url.includes("quiz-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => quizData,
        });
      }
      if (url.includes("schema-data.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => schemaData,
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ReactBasicsLessonPage />);

    // Wait for initial load
    await screen.findByText(lessonData.title);

    // Switch to schema tab
    await user.click(screen.getByRole("button", { name: "데이터 모델 설계" }));

    // Verify schema table is rendered
    expect(await screen.findByText("📁 lessons")).toBeInTheDocument();
    expect(screen.getByText("학습 과제 및 실습 단계 메타데이터")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("PK")).toBeInTheDocument();
  });
});
