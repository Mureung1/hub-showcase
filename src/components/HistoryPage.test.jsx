import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "./HistoryPage.jsx";
import { apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

const HISTORY_VIEW_MODE_KEY = "jansori.historyViewMode.v1";

function mockEmptyResponses() {
  vi.mocked(apiFetch).mockImplementation((path) => {
    if (path === "/api/tasks") return Promise.resolve({ data: [] });
    if (path === "/api/history") return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("HistoryPage 뷰 모드 기억", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockEmptyResponses();
  });

  it("저장된 값이 없으면 기존처럼 리스트 뷰로 시작한다 (happy path)", async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("리스트")).toBeInTheDocument());
    expect(screen.getByText("리스트").className).toContain("view-tab-active");
  });

  it("sessionStorage에 calendar가 저장돼 있으면 캘린더 뷰로 복원된다 (경계)", async () => {
    window.sessionStorage.setItem(HISTORY_VIEW_MODE_KEY, "calendar");

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("캘린더")).toBeInTheDocument());
    expect(screen.getByText("캘린더").className).toContain("view-tab-active");
  });

  it("탭을 클릭하면 sessionStorage에 저장된다", async () => {
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("캘린더")).toBeInTheDocument());
    fireEvent.click(screen.getByText("캘린더"));

    expect(window.sessionStorage.getItem(HISTORY_VIEW_MODE_KEY)).toBe("calendar");
  });

  it("Lv4에서 넘어온 날짜 지정 진입은 저장된 값보다 우선해 캘린더로 강제 진입한다 (경계)", async () => {
    window.sessionStorage.setItem(HISTORY_VIEW_MODE_KEY, "list");

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/history", state: { selectedDate: "2026-07-20T00:00:00.000Z" } },
        ]}
      >
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("캘린더")).toBeInTheDocument());
    expect(screen.getByText("캘린더").className).toContain("view-tab-active");
  });

  it("sessionStorage에 알 수 없는 값이 들어있으면 무시하고 리스트 뷰로 시작한다 (경계)", async () => {
    window.sessionStorage.setItem(HISTORY_VIEW_MODE_KEY, "garbage");

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("리스트")).toBeInTheDocument());
    expect(screen.getByText("리스트").className).toContain("view-tab-active");
  });
});

describe("HistoryPage insights", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  function mockInsightsResponses({
    streak = 5,
    includeStreak = true,
    history = [],
  } = {}) {
    vi.mocked(apiFetch).mockImplementation((path) => {
      if (path === "/api/tasks") {
        return Promise.resolve(
          includeStreak ? { data: [], streak } : { data: [] },
        );
      }
      if (path === "/api/history") return Promise.resolve({ data: history });
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
  }

  it("이번 주 요약 4개와 최근 7일 완료 추이를 표시한다", async () => {
    const completedAt = new Date().toISOString();
    mockInsightsResponses({
      history: [
        {
          taskId: "insight-1",
          title: "첫 번째 완료",
          completedAt,
          durationSeconds: 60,
          entryLevel: 2,
        },
        {
          taskId: "insight-2",
          title: "두 번째 완료",
          completedAt,
          durationSeconds: 120,
          entryLevel: 3,
        },
      ],
    });

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("이번 주 돌아보기")).toBeInTheDocument(),
    );
    expect(screen.getByText("이번 주 완료")).toBeInTheDocument();
    expect(screen.getByText("이번 주 집중 시간")).toBeInTheDocument();
    expect(screen.getByText("평균 개입 진입 레벨")).toBeInTheDocument();
    expect(screen.getByText("연속 완료")).toBeInTheDocument();
    expect(screen.getByText("2개")).toBeInTheDocument();
    expect(screen.getByText("3분")).toBeInTheDocument();
    expect(screen.getByText("Lv2.5")).toBeInTheDocument();
    expect(screen.getByText("5일")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /완료 \d+개/ })).toHaveLength(7);
    expect(screen.getByRole("img", { name: /완료 2개/ })).toBeInTheDocument();
  });

  it.each([
    ["누락", undefined, false],
    ["문자열", "5", true],
    ["음수", -1, true],
  ])("streak가 %s이면 0일로 표시한다", async (_label, streak, includeStreak) => {
    mockInsightsResponses({ streak, includeStreak });

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("0일")).toBeInTheDocument());
  });

  it("기록이 없어도 0 요약과 7일 그래프 및 기존 EmptyState를 유지한다", async () => {
    mockInsightsResponses({ streak: 0, history: [] });

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("이번 주 돌아보기")).toBeInTheDocument(),
    );
    expect(screen.getByText("0개")).toBeInTheDocument();
    expect(screen.getByText("0분")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("0일")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /완료 0개/ })).toHaveLength(7);
    expect(screen.getByText("아직 완료한 할일이 없어요.")).toBeInTheDocument();
  });

  it("리스트와 캘린더를 전환해도 Insight를 유지한다", async () => {
    mockInsightsResponses();

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("이번 주 돌아보기")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("캘린더"));
    expect(screen.getByText("이번 주 돌아보기")).toBeInTheDocument();
    expect(screen.getByLabelText("최근 7일 완료 개수")).toBeInTheDocument();
  });
});

describe("HistoryPage 캘린더 뷰의 completedAt 반영", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.mocked(apiFetch).mockImplementation((path) => {
      if (path === "/api/tasks") {
        return Promise.resolve({
          data: [
            {
              id: "t1",
              title: "완료된 과제",
              status: "done",
              createdAt: "2026-07-01T12:00:00.000Z",
            },
            {
              id: "t2",
              title: "진행 중인 과제",
              status: "active",
              createdAt: "2026-07-05T12:00:00.000Z",
            },
          ],
        });
      }
      if (path === "/api/history") {
        return Promise.resolve({
          data: [{ taskId: "t1", completedAt: "2026-07-20T12:00:00.000Z" }],
        });
      }
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
  });

  it("완료된 task는 등록일이 아니라 completedAt 날짜 셀에 나타난다 (happy path)", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/history", state: { selectedDate: "2026-07-20T00:00:00.000Z" } },
        ]}
      >
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("캘린더")).toBeInTheDocument());

    // completedAt(7/20) 셀 — 완료된 과제가 여기 나타나야 한다.
    // 완료된 task는 이제 "완료" 상태 라벨 대신 완료시각 요약("HH:mm 완료")을 보여준다.
    fireEvent.click(screen.getByText("20"));
    expect(screen.getByText("완료된 과제")).toBeInTheDocument();
    expect(document.querySelector(".calendar-day-detail-summary")?.textContent).toMatch(/완료$/);

    // createdAt(7/1) 셀 — 더 이상 여기 나타나면 안 된다(회귀 방지).
    // "1"은 다음 달 스필오버 셀(calendar-day-out)에도 나타나므로 이달 셀만 골라 클릭한다.
    const julyFirst = screen
      .getAllByText("1")
      .map((el) => el.closest("button"))
      .find((btn) => !btn.className.includes("calendar-day-out"));
    fireEvent.click(julyFirst);
    expect(screen.queryByText("완료된 과제")).not.toBeInTheDocument();
    expect(screen.getByText("이 날 등록된 할일이 없어요.")).toBeInTheDocument();
  });

  it("진행 중인 task는 completedAt이 없으므로 기존처럼 createdAt 날짜 셀에 나타난다 (경계)", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/history", state: { selectedDate: "2026-07-20T00:00:00.000Z" } },
        ]}
      >
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("캘린더")).toBeInTheDocument());

    fireEvent.click(screen.getByText("5"));
    expect(screen.getByText("진행 중인 과제")).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toBeInTheDocument();
  });

  it("날짜 상세 패널 라벨은 상태 구분 없이 중립적인 문구를 쓴다 (경계)", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/history", state: { selectedDate: "2026-07-20T00:00:00.000Z" } },
        ]}
      >
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("캘린더")).toBeInTheDocument());

    fireEvent.click(screen.getByText("20"));
    expect(screen.getByText("7월 20일 완료 기록")).toBeInTheDocument();
    expect(screen.queryByText(/에 등록된 할일$/)).not.toBeInTheDocument();
  });

  it("완료된 task의 날짜 상세에는 완료시각·집중시간·진입레벨 요약을 보여준다", async () => {
    vi.mocked(apiFetch).mockImplementation((path) => {
      if (path === "/api/tasks") {
        return Promise.resolve({
          data: [
            {
              id: "t1",
              title: "자료구조 복습",
              status: "done",
              createdAt: "2026-07-01T12:00:00.000Z",
            },
          ],
        });
      }
      if (path === "/api/history") {
        return Promise.resolve({
          data: [
            {
              taskId: "t1",
              completedAt: "2026-07-20T00:22:00.000Z",
              durationSeconds: 65,
              entryLevel: 4,
            },
          ],
        });
      }
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/history", state: { selectedDate: "2026-07-20T00:00:00.000Z" } },
        ]}
      >
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("캘린더")).toBeInTheDocument());
    fireEvent.click(screen.getByText("20"));

    expect(screen.getByText("자료구조 복습")).toBeInTheDocument();
    expect(document.querySelector(".calendar-day-detail-summary")?.textContent).toMatch(
      /완료 · 집중 1분 · Lv4$/,
    );
    // 첫 행동/회피 이유는 캘린더 하단 목록에는 표시하지 않는다.
    expect(screen.queryByText(/첫 행동/)).not.toBeInTheDocument();
  });
});

describe("HistoryPage 리스트 전체 보기/접기", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  function makeHistoryEntries(count) {
    return Array.from({ length: count }, (_, i) => ({
      taskId: `task-${i + 1}`,
      title: `기록 ${i + 1}`,
      completedAt: new Date(2026, 6, 20, 12, i).toISOString(),
      durationSeconds: null,
      entryLevel: null,
      microTask: null,
    }));
  }

  function mockHistoryList(history) {
    vi.mocked(apiFetch).mockImplementation((path) => {
      if (path === "/api/tasks") return Promise.resolve({ data: [] });
      if (path === "/api/history") return Promise.resolve({ data: history });
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
  }

  it("기록이 8개 이하면 더 보기 버튼이 없다 (경계)", async () => {
    mockHistoryList(makeHistoryEntries(8));

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("기록 1")).toBeInTheDocument());
    expect(screen.getByText("기록 8")).toBeInTheDocument();
    expect(screen.queryByText("전체 기록 보기")).not.toBeInTheDocument();
  });

  it("기록이 9개 이상이면 최초 8개만 표시하고 더 보기 버튼을 보여준다 (happy path)", async () => {
    mockHistoryList(makeHistoryEntries(9));

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("기록 1")).toBeInTheDocument());
    expect(screen.getByText("기록 8")).toBeInTheDocument();
    expect(screen.queryByText("기록 9")).not.toBeInTheDocument();

    const toggle = screen.getByText("전체 기록 보기");
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "history-list");
  });

  it("전체 기록 보기를 누르면 모든 기록을 표시하고 버튼 문구가 접기로 바뀐다", async () => {
    mockHistoryList(makeHistoryEntries(9));

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("기록 1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("전체 기록 보기"));

    expect(screen.getByText("기록 9")).toBeInTheDocument();
    const toggle = screen.getByText("접기");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("접기를 누르면 다시 최초 8개만 표시한다", async () => {
    mockHistoryList(makeHistoryEntries(9));

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText("기록 1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("전체 기록 보기"));
    expect(screen.getByText("기록 9")).toBeInTheDocument();

    fireEvent.click(screen.getByText("접기"));

    expect(screen.queryByText("기록 9")).not.toBeInTheDocument();
    expect(screen.getByText("기록 1")).toBeInTheDocument();
    expect(screen.getByText("전체 기록 보기")).toHaveAttribute("aria-expanded", "false");
  });
});
