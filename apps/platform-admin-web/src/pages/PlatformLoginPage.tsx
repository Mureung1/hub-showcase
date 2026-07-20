import { LockKeyhole, Mail, Stethoscope } from "lucide-react";
import { useState } from "react";
import { usePlatformAuth } from "../auth/PlatformAuthContext";

export function PlatformLoginPage() {
  const { session, profile, signIn, signOut } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (session && profile?.accountType !== "platform_admin") {
    return (
      <main className="platform-auth-page">
        <section className="platform-auth-panel">
          <h1>플랫폼 관리자 계정이 아닙니다</h1>
          <p>권한이 등록된 개발용 플랫폼 관리자 계정으로 로그인해 주세요.</p>
          <button className="secondary-button" type="button" onClick={() => void signOut()}>다른 계정으로 로그인</button>
        </section>
      </main>
    );
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="platform-auth-page">
      <section className="platform-auth-panel">
        <span className="brand-mark"><Stethoscope size={22} /></span>
        <h1>플랫폼 관리자 로그인</h1>
        <p>병원 입점과 정보 변경 요청을 검토하는 관리자 화면입니다.</p>
        <label>이메일<span className="auth-input"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></span></label>
        <label>비밀번호<span className="auth-input"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></span></label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="primary-button" type="button" disabled={submitting || !email || password.length < 8} onClick={() => void submit()}>
          {submitting ? "로그인 중" : "로그인"}
        </button>
      </section>
    </main>
  );
}
