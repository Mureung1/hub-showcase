import { useState, type FormEvent } from "react";
import type { AuthService } from "../services/auth";

type LoginPageProps = {
  auth: AuthService;
};

function LoginPage({ auth }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = auth.isConfigured();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !configured || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await auth.sendMagicLink(email.trim(), `${window.location.origin}/login`);
      setSentTo(result.email);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "로그인 링크를 보내지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="narrow-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="section-kicker">Passwordless access</p>
        <h1 id="login-title">이메일로 안전하게 시작하세요</h1>
        <p>
          받은 편지함의 링크를 누르면 로그인됩니다. 비밀번호를 새로 만들거나 기억할 필요가 없습니다.
        </p>

        {!configured && (
          <div className="notice warning" role="status">
            현재 로그인 서비스를 사용할 수 없습니다. 잠시 후 다시 시도하거나 서비스 관리자에게 알려 주세요.
          </div>
        )}

        {sentTo ? (
          <div className="success-state" role="status">
            <span aria-hidden="true">✓</span>
            <h2>로그인 링크를 보냈습니다</h2>
            <p><strong>{sentTo}</strong>의 받은 편지함과 스팸함을 확인해 주세요.</p>
            <button className="button secondary" type="button" onClick={() => setSentTo(null)}>
              다른 이메일 사용
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="field">
              <span>이메일</span>
              <input
                data-testid="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="team@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-email-error" : undefined}
                required
              />
            </label>
            {error && <p id="login-email-error" className="form-error" role="alert">{error}</p>}
            <button
              data-testid="login-submit"
              className="button primary full-button"
              type="submit"
              disabled={!configured || pending || !email.trim()}
            >
              {pending ? "링크 보내는 중…" : "로그인 링크 받기"}
            </button>
          </form>
        )}
        <p className="privacy-copy">
          로그인 후 저장한 프로젝트는 계정별로 격리되며, 명시적으로 만든 읽기 전용 링크만 외부에 공개됩니다.
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
