import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePlatformAuth } from "../auth/PlatformAuthContext";
import { PlatformLoginPage } from "./PlatformLoginPage";

vi.mock("../auth/PlatformAuthContext", () => ({
  usePlatformAuth: vi.fn(),
}));

const mockUsePlatformAuth = vi.mocked(usePlatformAuth);
const signIn = vi.fn();
const signOut = vi.fn();

type AuthValue = ReturnType<typeof usePlatformAuth>;

function renderPage() {
  render(<PlatformLoginPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePlatformAuth.mockReturnValue({
    session: null,
    profile: null,
    loading: false,
    signIn,
    signOut,
  });
});

describe("PlatformLoginPage", () => {
  test("이메일과 8자 이상의 비밀번호를 입력해야 로그인할 수 있다", () => {
    renderPage();

    const loginButton = screen.getByRole("button", { name: "로그인" });
    expect(loginButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "short" },
    });
    expect(loginButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "password123" },
    });
    expect(loginButton).toBeEnabled();
  });

  test("로그인할 때 이메일 양끝 공백을 제거한다", async () => {
    signIn.mockResolvedValue(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "  admin@example.com  " },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("admin@example.com", "password123");
    });
  });

  test("로그인 실패 이유를 화면에 표시한다", async () => {
    signIn.mockRejectedValue(new Error("이메일 또는 비밀번호가 올바르지 않습니다."));
    renderPage();

    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  });

  test("플랫폼 관리자가 아닌 계정은 관리자 화면에 진입하지 못한다", () => {
    mockUsePlatformAuth.mockReturnValue({
      session: { access_token: "patient-token" } as AuthValue["session"],
      profile: {
        id: "patient-id",
        accountType: "patient",
        status: "active",
      },
      loading: false,
      signIn,
      signOut,
    });
    renderPage();

    expect(screen.getByRole("heading", { name: "플랫폼 관리자 계정이 아닙니다" }))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다른 계정으로 로그인" }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});
