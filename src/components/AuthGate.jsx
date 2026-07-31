import AuthPanel from "./AuthPanel.jsx";
import { useAuth } from "../auth/useAuth.js";

function AuthGateScreen() {
  const { startGuestDemo } = useAuth();

  return (
    <main className="auth-gate-shell">
      <div className="auth-gate-content">
        <header className="auth-gate-brand">
          <div className="brand-lockup" aria-label="UniRadar">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <div>
              <strong>UniRadar</strong>
              <small>대학생 맞춤형 기회 탐색 에이전트</small>
            </div>
          </div>
          <p>로그인하면 내 프로필과 저장된 공고를 불러옵니다.</p>
        </header>
        <AuthPanel />
        <section className="guest-demo-panel" aria-label="로그인 없는 시연">
          <div>
            <strong>로그인 없이 시연하기</strong>
            <p>예시 공고 스캔, mock 분석, 저장 공고와 태스크 관리를 이 브라우저에서 체험합니다.</p>
          </div>
          <button className="secondary-button" type="button" onClick={startGuestDemo}>시연 모드 시작</button>
        </section>
        <p className="auth-gate-note">
          실제 사이트 스캔, Gemini 분석, 계정 저장소는 로그인한 사용자에게만 제공됩니다.
        </p>
      </div>
    </main>
  );
}

export default function AuthGate({ children }) {
  const { isAuthLoading, isGuestDemo, user } = useAuth();

  if (isAuthLoading || (!isGuestDemo && !user)) {
    return <AuthGateScreen />;
  }

  return children;
}
