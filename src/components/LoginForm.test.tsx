import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const session = { user: { id: "user-1" } } as Session;

function fillLoginForm() {
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: " swimmer@example.com " } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } });
}

describe("LoginForm", () => {
  it("requires both email and password", () => {
    const onSignIn = vi.fn();
    render(<LoginForm onSignIn={onSignIn} onAuthenticated={vi.fn()} onMoveToSignUp={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(screen.getByRole("alert")).toHaveTextContent("이메일과 비밀번호를 모두 입력해 주세요.");
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("prevents duplicate submission and returns the authenticated session", async () => {
    let resolveLogin: ((value: Session) => void) | undefined;
    const onSignIn = vi.fn(() => new Promise<Session>((resolve) => { resolveLogin = resolve; }));
    const onAuthenticated = vi.fn();
    render(<LoginForm onSignIn={onSignIn} onAuthenticated={onAuthenticated} onMoveToSignUp={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    fireEvent.click(screen.getByRole("button", { name: "로그인하는 중..." }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledWith({ email: "swimmer@example.com", password: "password123" });
    expect(screen.getByRole("button", { name: "로그인하는 중..." })).toBeDisabled();
    resolveLogin?.(session);
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(session));
  });

  it("shows the authentication error and keeps the form available", async () => {
    const onSignIn = vi.fn().mockRejectedValue(new Error("이메일 또는 비밀번호가 올바르지 않아요."));
    render(<LoginForm onSignIn={onSignIn} onAuthenticated={vi.fn()} onMoveToSignUp={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("이메일 또는 비밀번호가 올바르지 않아요.");
  });
});
