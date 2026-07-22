import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignUpForm } from "./SignUpForm";

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "swimmer@example.com" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "고요한수영" } });
}

describe("SignUpForm", () => {
  it("shows validation errors without submitting empty values", () => {
    const onSignUp = vi.fn();
    render(<SignUpForm onSignUp={onSignUp} onMoveToLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "나의 음악 일기 시작하기" }));
    expect(screen.getByText("이메일을 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("비밀번호를 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("닉네임을 입력해 주세요.")).toBeInTheDocument();
    expect(onSignUp).not.toHaveBeenCalled();
  });

  it("submits normalized values once and moves to email confirmation guidance", async () => {
    let resolveSignUp: ((value: { requiresEmailConfirmation: boolean }) => void) | undefined;
    const onSignUp = vi.fn(() => new Promise<{ requiresEmailConfirmation: boolean }>((resolve) => { resolveSignUp = resolve; }));
    const onMoveToLogin = vi.fn();
    render(<SignUpForm onSignUp={onSignUp} onMoveToLogin={onMoveToLogin} />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "나의 음악 일기 시작하기" }));
    fireEvent.click(screen.getByRole("button", { name: "가입하는 중..." }));
    expect(onSignUp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "가입하는 중..." })).toBeDisabled();
    resolveSignUp?.({ requiresEmailConfirmation: true });
    await waitFor(() => expect(onMoveToLogin).toHaveBeenCalledWith(expect.stringContaining("이메일의 확인 링크")));
  });

  it("keeps the form visible and explains a signup failure", async () => {
    const onSignUp = vi.fn().mockRejectedValue(new Error("이미 사용 중인 닉네임이에요."));
    render(<SignUpForm onSignUp={onSignUp} onMoveToLogin={vi.fn()} />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "나의 음악 일기 시작하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("이미 사용 중인 닉네임이에요.");
  });
});
