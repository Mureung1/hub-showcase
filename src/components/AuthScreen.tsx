import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { signIn, signUp } from "../services/authService";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";

interface AuthScreenProps {
  onAuthenticated: (session: Session) => void;
  initialMode?: "signup" | "login";
  initialNotice?: string;
}

export function AuthScreen({ onAuthenticated, initialMode = "login", initialNotice = "" }: AuthScreenProps) {
  const [view, setView] = useState<"signup" | "login">(initialMode);
  const [notice, setNotice] = useState(initialNotice);

  const moveToLogin = (nextNotice = "") => {
    setNotice(nextNotice);
    setView("login");
  };

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-labelledby="auth-title">
        <p className="eyebrow">SWIM</p>
        <h1 id="auth-title">One Day.<br />One Song.<br />One Memory.</h1>
        <p>오늘을 닮은 한 곡과 짧은 마음을 남겨보세요.<br />당신의 날들이 조용히 음악 일기가 됩니다.</p>
      </section>

      <section className="auth-panel" aria-labelledby="auth-form-title">
        {view === "signup" ? (
          <>
            <p className="page-kicker">Begin your diary</p>
            <h2 id="auth-form-title">SWIM 시작하기</h2>
            <p className="auth-description">음악으로 기억하고 싶은 이름을 알려주세요.</p>
            <SignUpForm onSignUp={signUp} onMoveToLogin={moveToLogin} />
          </>
        ) : (
          <div className="login-entry">
            <p className="page-kicker">Welcome back</p>
            <h2 id="auth-form-title">로그인</h2>
            {notice && <p className="auth-notice" role="status">{notice}</p>}
            <p className="auth-description">다시 음악으로 오늘을 이어가세요.</p>
            <LoginForm onSignIn={signIn} onAuthenticated={onAuthenticated} onMoveToSignUp={() => { setNotice(""); setView("signup"); }} />
          </div>
        )}
      </section>
    </main>
  );
}
