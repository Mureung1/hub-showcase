// @vitest-environment jsdom

import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { AuthContext } from "../../src/auth/AuthProvider.jsx";
import AuthGate from "../../src/components/AuthGate.jsx";

function renderAuthGate(overrides = {}) {
  const auth = {
    authError: null,
    isAuthLoading: false,
    isConfigured: true,
    session: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    user: null,
    ...overrides,
  };

  render(
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(
        AuthGate,
        null,
        createElement("div", null, "보호된 서비스"),
      ),
    ),
  );
}

afterEach(cleanup);

describe("AuthGate", () => {
  it("세션 확인 중에는 보호된 서비스를 렌더링하지 않는다", () => {
    renderAuthGate({ isAuthLoading: true });

    expect(screen.getByText("세션을 확인하는 중입니다.")).toBeTruthy();
    expect(screen.queryByText("보호된 서비스")).toBeNull();
  });

  it("로그인하지 않은 사용자는 독립 로그인 화면만 볼 수 있다", () => {
    renderAuthGate();

    expect(screen.getByRole("heading", { name: "로그인" })).toBeTruthy();
    expect(screen.getByLabelText(/^아이디/)).toBeTruthy();
    expect(screen.getByLabelText(/^비밀번호/)).toBeTruthy();
    expect(screen.queryByText("보호된 서비스")).toBeNull();
  });

  it("로그인한 사용자에게만 보호된 서비스를 렌더링한다", () => {
    renderAuthGate({ user: { id: "user-1" } });

    expect(screen.getByText("보호된 서비스")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "로그인" })).toBeNull();
  });

  it("인증 설정이 없으면 설정 안내만 표시한다", () => {
    renderAuthGate({ isConfigured: false });

    expect(screen.getByRole("heading", { name: "계정 연결 준비 중" })).toBeTruthy();
    expect(screen.queryByText("보호된 서비스")).toBeNull();
  });
});
