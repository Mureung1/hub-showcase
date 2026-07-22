import { FormEvent, useState } from "react";
import type { SignUpInput, SignUpResult } from "../services/authService";

interface SignUpFormProps {
  onSignUp: (input: SignUpInput) => Promise<SignUpResult>;
  onMoveToLogin: (notice?: string) => void;
}

interface FieldErrors {
  email?: string;
  password?: string;
  nickname?: string;
}

function validate(email: string, password: string, nickname: string) {
  const errors: FieldErrors = {};

  if (!email.trim()) errors.email = "이메일을 입력해 주세요.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "올바른 이메일 형식으로 입력해 주세요.";

  if (!password) errors.password = "비밀번호를 입력해 주세요.";
  else if (password.length < 8) errors.password = "비밀번호는 8자 이상이어야 해요.";

  if (!nickname.trim()) errors.nickname = "닉네임을 입력해 주세요.";
  else if (nickname.trim().length < 2 || nickname.trim().length > 20) errors.nickname = "닉네임은 2~20자로 입력해 주세요.";

  return errors;
}

export function SignUpForm({ onSignUp, onMoveToLogin }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate(email, password, nickname);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await onSignUp({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
      });
      onMoveToLogin(result.requiresEmailConfirmation
        ? "가입했어요. 이메일의 확인 링크를 누른 뒤 로그인해 주세요."
        : "가입했어요. 새 계정으로 로그인해 주세요.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "회원가입을 완료하지 못했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label htmlFor="signup-email">이메일</label>
        <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "signup-email-error" : undefined} placeholder="you@example.com" />
        {errors.email && <span id="signup-email-error" className="field-error">{errors.email}</span>}
      </div>
      <div className="auth-field">
        <label htmlFor="signup-password">비밀번호</label>
        <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "signup-password-error" : undefined} placeholder="8자 이상 입력" />
        {errors.password && <span id="signup-password-error" className="field-error">{errors.password}</span>}
      </div>
      <div className="auth-field">
        <label htmlFor="signup-nickname">닉네임</label>
        <input id="signup-nickname" autoComplete="nickname" maxLength={20} value={nickname} onChange={(event) => setNickname(event.target.value)} aria-invalid={Boolean(errors.nickname)} aria-describedby={errors.nickname ? "signup-nickname-error" : undefined} placeholder="기록에 표시될 이름" />
        {errors.nickname && <span id="signup-nickname-error" className="field-error">{errors.nickname}</span>}
      </div>

      {formError && <p className="auth-error" role="alert">{formError}</p>}
      <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "가입하는 중..." : "나의 음악 일기 시작하기"}</button>
      <button className="auth-text-button" type="button" onClick={() => onMoveToLogin()}>이미 계정이 있나요? 로그인</button>
    </form>
  );
}
