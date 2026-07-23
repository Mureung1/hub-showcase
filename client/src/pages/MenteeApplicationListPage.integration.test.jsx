import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import MenteeApplicationListPage from "./MenteeApplicationListPage";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe("MenteeApplicationListPage 빈 목록 (integration)", () => {
  it("신청 내역이 없으면 대기 상태 빈 안내를 표시한다", async () => {
    server.use(
      http.get("http://localhost:4000/api/applications", () =>
        HttpResponse.json({ data: [], meta: { total: 0 } }),
      ),
    );

    render(
      <MemoryRouter>
        <MenteeApplicationListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("대기 상태의 신청이 없습니다.")).toBeInTheDocument();
  });
});
