import { LockKeyhole, Mail, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { useStaffAuth } from "../auth/StaffAuthContext";

export function StaffLoginPage() {
  const {
    session,
    profile,
    loading,
    signIn,
    signUp,
    resendConfirmation,
    completeProfile,
    signOut,
  } = useStaffAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const phoneValid = /^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneNumber);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function normalizedPhoneNumber() {
    const digits = phoneNumber.replace(/\D/g, "");
    return `+82${digits.slice(1)}`;
  }

  async function submit() {
    if (!emailValid || !passwordValid || (mode === "signup" && !phoneValid)) return;
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        return;
      }
      const confirmationRequired = await signUp(
        email.trim(),
        password,
        normalizedPhoneNumber(),
      );
      if (confirmationRequired) {
        setConfirmationEmail(email.trim());
        setResendCooldown(60);
      }
      setMessage(confirmationRequired
        ? "가입 확인 메일을 보냈습니다. 이메일 확인 후 로그인해 주세요."
        : "회원가입이 완료되었습니다.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "인증 요청을 처리하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitProfile() {
    if (!phoneValid) return;
    setSubmitting(true);
    setMessage("");
    try {
      await completeProfile(normalizedPhoneNumber());
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "프로필을 등록하지 못했습니다.");
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
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "인증 메일을 다시 보내지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (session && profile?.accountType !== "hospital_admin" && profile) {
    return (
      <AuthPanel title="병원 관리자 계정이 아닙니다">
        <p>환자 계정은 병원 관리자 화면을 이용할 수 없습니다.</p>
        <button className="secondary-button" type="button" onClick={() => void signOut()}>
          다른 계정으로 로그인
        </button>
      </AuthPanel>
    );
  }
  if (session && !profile) {
    return (
      <AuthPanel title="병원 관리자 프로필 완성">
        <p>입점 문의와 대기열 운영에 사용할 담당자 휴대전화 번호를 입력해 주세요.</p>
        <PhoneField value={phoneNumber} onChange={setPhoneNumber} />
        {!phoneValid && <p className="field-error">올바른 국내 휴대전화 번호를 입력해 주세요.</p>}
        {message && <p role="status">{message}</p>}
        <button className="primary-button" type="button" disabled={!phoneValid || submitting} onClick={() => void submitProfile()}>
          {submitting ? "등록 중" : "프로필 등록"}
        </button>
        <button className="secondary-button" type="button" onClick={() => void signOut()}>
          다른 계정으로 로그인
        </button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title={mode === "login" ? "병원 관리자 로그인" : "병원 관리자 회원가입"}>
      <div className="segmented-control" aria-label="계정 화면">
        <button className={mode === "login" ? "is-selected" : ""} type="button" onClick={() => setMode("login")}>로그인</button>
        <button className={mode === "signup" ? "is-selected" : ""} type="button" onClick={() => setMode("signup")}>회원가입</button>
      </div>
      <p>이메일 확인을 마친 병원 관리자 계정으로 이용할 수 있습니다.</p>
      <label>
        이메일
        <span className="auth-input"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></span>
      </label>
      {mode === "signup" && <PhoneField value={phoneNumber} onChange={setPhoneNumber} />}
      <label>
        비밀번호
        <span className="auth-input"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></span>
      </label>
      {!emailValid && <p className="field-error">올바른 이메일을 입력해 주세요.</p>}
      {!passwordValid && <p className="field-error">비밀번호는 8자 이상이어야 합니다.</p>}
      {mode === "signup" && !phoneValid && <p className="field-error">올바른 국내 휴대전화 번호를 입력해 주세요.</p>}
      {message && <p role="status">{message}</p>}
      {confirmationEmail && (
        <button className="secondary-button" type="button" disabled={submitting || resendCooldown > 0} onClick={() => void resend()}>
          {resendCooldown > 0 ? `${resendCooldown}초 후 인증 메일 재발송` : "인증 메일 재발송"}
        </button>
      )}
      <button className="primary-button" type="button" disabled={submitting || !emailValid || !passwordValid || (mode === "signup" && !phoneValid)} onClick={() => void submit()}>
        {submitting ? "처리 중" : mode === "login" ? "로그인" : "가입 확인 메일 받기"}
      </button>
    </AuthPanel>
  );
}

function AuthPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="auth-page content-width">
      <section className="auth-panel" aria-labelledby="staff-auth-title">
        <span className="brand-mark" aria-hidden="true"><Stethoscope size={22} /></span>
        <h1 id="staff-auth-title">{title}</h1>
        {children}
      </section>
    </main>
  );
}

function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label>
      휴대전화 번호
      <span className="auth-input">
        <input type="tel" value={value} onChange={(event) => onChange(event.target.value)} placeholder="010-1234-5678" autoComplete="tel" />
      </span>
    </label>
  );
}
