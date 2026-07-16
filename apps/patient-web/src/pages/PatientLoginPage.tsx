import { LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { usePatientAuth } from "../auth/PatientAuthContext";
import { AppHeader } from "../components/AppHeader";

export function PatientLoginPage() {
  const { session, profile, loading, signIn, signUp, resendConfirmation, signOut, completeProfile } = usePatientAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("patient@example.com");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const phoneValid = /^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneNumber);
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/";

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  if (loading) return null;
  if (session && profile) return <Navigate to={returnTo} replace />;

  async function submitProfile() {
    if (!phoneValid) return;
    setSubmitting(true);
    setMessage("");
    try {
      const digits = phoneNumber.replace(/\D/g, "");
      await completeProfile(`+82${digits.slice(1)}`);
      navigate(returnTo, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로필을 등록하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!emailValid || !passwordValid || (mode === "signup" && !phoneValid)) return;
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        navigate(returnTo, { replace: true });
        return;
      }
      const digits = phoneNumber.replace(/\D/g, "");
      const confirmationRequired = await signUp(email.trim(), password, `+82${digits.slice(1)}`);
      if (confirmationRequired) {
        setConfirmationEmail(email.trim());
        setResendCooldown(60);
      }
      setMessage(confirmationRequired
        ? "가입 확인 메일을 보냈습니다. 이메일 확인 후 로그인해 주세요."
        : "회원가입이 완료되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "인증 요청을 처리하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (!confirmationEmail || resendCooldown > 0) return;
    setSubmitting(true);
    try {
      await resendConfirmation(confirmationEmail);
      setMessage("가입 확인 메일을 다시 보냈습니다.");
      setResendCooldown(60);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "인증 메일을 다시 보내지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (session) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="auth-page content-width">
          <section className="auth-panel" aria-labelledby="profile-title">
            <h1 id="profile-title">환자 프로필 완성</h1>
            <p>원격 웨이팅 알림을 받을 휴대전화 번호를 입력해 주세요.</p>
            <label>
              휴대전화 번호
              <span className="auth-input">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="010-1234-5678"
                  autoComplete="tel"
                />
              </span>
            </label>
            {!phoneValid && <p className="field-error">올바른 국내 휴대전화 번호를 입력해 주세요.</p>}
            {message && <p role="status">{message}</p>}
            <button className="primary-button" type="button" disabled={!phoneValid || submitting} onClick={() => void submitProfile()}>
              {submitting ? "등록 중" : "프로필 등록"}
            </button>
            <button className="secondary-button" type="button" onClick={() => void signOut()}>다른 계정으로 로그인</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="auth-page content-width">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="segmented-control" aria-label="계정 화면">
            <button
              className={mode === "login" ? "is-selected" : ""}
              type="button"
              onClick={() => setMode("login")}
            >
              로그인
            </button>
            <button
              className={mode === "signup" ? "is-selected" : ""}
              type="button"
              onClick={() => setMode("signup")}
            >
              회원가입
            </button>
          </div>
          <h1 id="auth-title">{mode === "login" ? "환자 로그인" : "환자 회원가입"}</h1>
          <p>이메일 확인을 마친 환자 계정으로 원격 웨이팅을 이용할 수 있습니다.</p>
          <label>
            이메일
            <span className="auth-input">
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </span>
          </label>
          {mode === "signup" && (
            <label>
              휴대전화 번호
              <span className="auth-input">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="010-1234-5678"
                  autoComplete="tel"
                />
              </span>
            </label>
          )}
          <label>
            비밀번호
            <span className="auth-input">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </span>
          </label>
          {!emailValid && <p className="field-error">올바른 이메일을 입력해 주세요.</p>}
          {!passwordValid && <p className="field-error">비밀번호는 8자 이상이어야 합니다.</p>}
          {mode === "signup" && !phoneValid && (
            <p className="field-error">올바른 국내 휴대전화 번호를 입력해 주세요.</p>
          )}
          {message && <p role="status">{message}</p>}
          {confirmationEmail && (
            <button className="secondary-button" type="button" disabled={submitting || resendCooldown > 0} onClick={() => void resend()}>
              {resendCooldown > 0 ? `${resendCooldown}초 후 인증 메일 재발송` : "인증 메일 재발송"}
            </button>
          )}
          <button
            className="primary-button"
            type="button"
            onClick={submit}
            disabled={!emailValid || !passwordValid || (mode === "signup" && !phoneValid) || submitting}
          >
            {submitting ? "처리 중" : mode === "login" ? "로그인" : "가입 확인 메일 받기"}
          </button>
        </section>
      </main>
    </div>
  );
}
