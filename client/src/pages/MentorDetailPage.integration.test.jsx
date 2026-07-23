import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import MentorDetailPage from "./MentorDetailPage";
import { routePaths } from "../routes/routePaths";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe("MentorDetailPage 존재하지 않는 멘토 (integration)", () => {
  it("없는 멘토 id로 접근하면 멘토 정보를 찾을 수 없다는 안내를 표시한다", async () => {
    server.use(
      http.get("http://localhost:4000/api/mentors/non-existent-mentor-id", () =>
        HttpResponse.json(
          { error: { code: "MENTOR_NOT_FOUND", message: "멘토 정보를 찾을 수 없습니다.", details: {} } },
          { status: 404 },
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/mentee/mentors/non-existent-mentor-id"]}>
        <Routes>
          <Route path={routePaths.menteeMentorDetail} element={<MentorDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "멘토 정보를 찾을 수 없습니다" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "이전 화면으로" })).toBeInTheDocument();
  });
});
