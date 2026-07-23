import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import MentorListPage from "./MentorListPage";
import { AuthProvider } from "../context/AuthContext";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

const renderMentorListPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <MentorListPage />
      </AuthProvider>
    </MemoryRouter>,
  );

describe("MentorListPage 빈 목록 / 네트워크 오류 (integration)", () => {
  it("멘토 목록이 비어있으면 빈 상태 안내를 표시한다", async () => {
    server.use(
      http.get("http://localhost:4000/api/mentors", () =>
        HttpResponse.json({ data: [], meta: { total: 0 } }),
      ),
    );

    renderMentorListPage();

    expect(await screen.findByText("조건에 맞는 멘토가 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("0명")).toBeInTheDocument();
  });

  it("네트워크 오류가 나면 연결 실패 안내를 표시한다", async () => {
    server.use(http.get("http://localhost:4000/api/mentors", () => HttpResponse.error()));

    renderMentorListPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.",
    );
  });
});
