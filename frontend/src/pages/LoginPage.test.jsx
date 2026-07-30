import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import LoginPage from "./LoginPage";

const { firebaseAuthMock } = vi.hoisted(() => ({
  firebaseAuthMock: {},
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  signInWithPopup: vi.fn(),
}));

vi.mock("../firebase", () => ({
  firebaseAuth: firebaseAuthMock,
}));

vi.mock("../api/authApi", () => ({
  getCurrentUser: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("LoginPage", () => {
  it("Google 로그인 방식과 모바일 서비스 가치를 화면에 표시한다", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: "Google 계정으로 로그인" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("흩어진 레시피와 기억을 한 권에 담아보세요."),
    ).toBeInTheDocument();
  });
});
