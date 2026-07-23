import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import App from "./App";
import { setAccessToken, clearAccessToken } from "./utils/authStorage";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  clearAccessToken();
});
afterAll(() => server.close());

describe("세션 만료 처리 (integration)", () => {
  it("로그인된 상태에서 API가 401을 반환하면 로그인 화면으로 이동하고 만료 안내 메시지를 보여준다", async () => {
    setAccessToken("valid-token");
    server.use(
      http.get("http://localhost:4000/api/auth/me", () =>
        HttpResponse.json({
          data: { id: "mentee-1", email: "mentee@example.com", role: "mentee", name: "홍길동", nickname: "길동" },
        }),
      ),
      // 멘토 목록 조회 도중 토큰이 만료된 상황을 재현한다 (로그인 요청이 아닌 401).
      http.get("http://localhost:4000/api/mentors", () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "유효하지 않거나 만료된 토큰입니다.", details: {} } },
          { status: 401 },
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/mentee/mentors"]}>
        <App />
      </MemoryRouter>,
    );

    // 세션 만료로 로그인 화면(첫 화면)으로 리다이렉트되며 안내 메시지가 뜨는지 확인한다.
    expect(await screen.findByText("세션이 만료되었습니다. 다시 로그인해 주세요.")).toBeInTheDocument();
    const signupLinks = await screen.findAllByRole("link", { name: "회원가입" });
    expect(signupLinks.length).toBeGreaterThan(0);
  });
});
