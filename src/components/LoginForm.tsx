import { FormEvent, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SignInInput } from "../services/authService";

interface LoginFormProps {
  onSignIn: (input: SignInInput) => Promise<Session>;
  onAuthenticated: (session: Session) => void;
  onMoveToSignUp: () => void;
}

export function LoginForm({ onSignIn, onAuthenticated, onMoveToSignUp }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!email.trim() || !password) {
      setFormError("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const session = await onSignIn({ email: email.trim(), password });
      onAuthenticated(session);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "로그인하지 못했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label htmlFor="login-email">이메일</label>
        <input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
      </div>
      <div className="auth-field">
        <label htmlFor="login-password">비밀번호</label>
        <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호 입력" />
      </div>

      {formError && <p className="auth-error" role="alert">{formError}</p>}
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "로그인하는 중..." : "로그인"}</button>
      <button className="auth-text-button" type="button" onClick={onMoveToSignUp}>처음이신가요? 계정 만들기</button>
    </form>
  );
}
