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
    fireEvent.click(screen.getByText("20"));
    expect(screen.getByText("완료된 과제")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();

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
    expect(screen.getByText("7월 20일의 할일")).toBeInTheDocument();
    expect(screen.queryByText(/에 등록된 할일$/)).not.toBeInTheDocument();
  });
});
