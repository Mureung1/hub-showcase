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
