import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import App from "../App";
import { setAccessToken, clearAccessToken } from "../utils/authStorage";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  clearAccessToken();
});
afterAll(() => server.close());

const mockCurrentUser = (user) => {
  server.use(http.get("http://localhost:4000/api/auth/me", () => HttpResponse.json({ data: user })));
};

describe("RoleRoute integration", () => {
  it("멘티로 로그인한 상태에서 멘토 전용 페이지(/mentor/home)로 이동하면 접근 불가 화면으로 리다이렉트된다", async () => {
    setAccessToken("valid-token");
    mockCurrentUser({
      id: "user-1",
      email: "mentee@example.com",
      role: "mentee",
      name: "홍길동",
      nickname: "길동",
    });

    render(
      <MemoryRouter initialEntries={["/mentor/home"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText("접근할 수 없는 화면입니다")).toBeInTheDocument();
  });

  it("멘토로 로그인한 상태에서 멘티 전용 페이지(/mentee/mypage/applications)로 이동하면 접근 불가 화면으로 리다이렉트된다", async () => {
    setAccessToken("valid-token");
    mockCurrentUser({
      id: "user-2",
      email: "mentor@example.com",
      role: "mentor",
      name: "김민준",
      nickname: "민준",
    });

    render(
      <MemoryRouter initialEntries={["/mentee/mypage/applications"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText("접근할 수 없는 화면입니다")).toBeInTheDocument();
  });

  it("로그인하지 않은 상태로 역할 보호 라우트(/mentor/home)에 접근하면 첫 화면(로그인 화면)으로 리다이렉트된다", async () => {
    // access token을 설정하지 않으면 AuthProvider가 /auth/me를 호출하지 않고 바로 isCheckingAuth를 끝낸다.
    render(
      <MemoryRouter initialEntries={["/mentor/home"]}>
        <App />
      </MemoryRouter>,
    );

    // routePaths.landingLogin은 "/#login"이라 pathname은 "/"(LandingPage)로 매칭된다.
    // "회원가입" 링크는 헤더와 LoginCard에 중복 존재하므로 findAllByRole로 확인한다.
    const signupLinks = await screen.findAllByRole("link", { name: "회원가입" });
    expect(signupLinks.length).toBeGreaterThan(0);
  });
});
