import { useState } from "react";
import { useAuth } from "../auth/useAuth.js";

const initialForm = { email: "", password: "" };

export default function AuthPanel() {
  const { authError, isAuthLoading, isConfigured, signIn, signOut, signUp, user } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setLocalError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setLocalError("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setLocalError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const result = await signUp({ email: form.email.trim(), password: form.password });
        setMessage(result.needsEmailConfirmation
          ? "가입 확인 이메일을 보냈습니다. 인증을 완료한 뒤 로그인해 주세요."
          : "회원가입과 로그인이 완료되었습니다.");
      } else {
        await signIn({ email: form.email.trim(), password: form.password });
      }
      setForm(initialForm);
    } catch (error) {
      setLocalError(error.message || "인증 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return <section className="auth-panel" aria-label="계정 상태"><p>세션을 확인하는 중입니다.</p></section>;
  }

  if (!isConfigured) {
    return (
      <section className="auth-panel auth-setup-panel" aria-label="계정 설정 필요">
        <div>
          <p className="eyebrow">Account</p>
          <h2>계정 연결 준비 중</h2>
          <p>Supabase 환경변수를 설정하면 회원가입과 계정별 프로필 저장을 사용할 수 있습니다.</p>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="auth-panel auth-user-panel" aria-label="로그인된 계정">
        <div>
          <p className="eyebrow">Account</p>
          <h2>로그인됨</h2>
          <p>{user.email}</p>
        </div>
        <button className="secondary-button compact-button" type="button" onClick={() => signOut().catch(() => {})}>
          로그아웃
        </button>
      </section>
    );
  }

  const isSignUp = mode === "signup";
  return (
    <section className="auth-panel" id="account-access" aria-labelledby="auth-panel-title">
      <div className="auth-panel-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h2 id="auth-panel-title">{isSignUp ? "회원가입" : "로그인"}</h2>
          <p>프로필은 로그인한 계정에만 저장됩니다.</p>
        </div>
        <div className="auth-mode-toggle" aria-label="인증 방식">
          <button className={!isSignUp ? "is-active" : ""} type="button" onClick={() => setMode("signin")}>로그인</button>
          <button className={isSignUp ? "is-active" : ""} type="button" onClick={() => setMode("signup")}>회원가입</button>
        </div>
      </div>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>이메일</span>
          <input autoComplete="email" inputMode="email" type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <input autoComplete={isSignUp ? "new-password" : "current-password"} minLength="6" type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} />
        </label>
        {localError || authError ? <p className="form-message error-message" role="alert">{localError || authError}</p> : null}
        {message ? <p className="form-message success-message" role="status">{message}</p> : null}
        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "처리 중" : isSignUp ? "회원가입" : "로그인"}
        </button>
      </form>
    </section>
  );
}