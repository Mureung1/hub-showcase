import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getSupabaseClient } from '../../services/supabaseClient';
import { formatAuthError } from '../../utils/authHelpers';
import { getAuthRedirectUrl } from '../../utils/authRedirect';
import './auth.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const from =
    (location.state as { from?: string } | null)?.from?.startsWith('/user') === true
      ? (location.state as { from: string }).from
      : '/user';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error_description') ?? params.get('error');
    if (error) {
      setMessage(decodeURIComponent(error.replace(/\+/g, ' ')));
    }
  }, [location.search]);

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Supabase Auth 설정이 없습니다. .env.local을 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }

      navigate(from, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Supabase Auth 설정이 없습니다. .env.local을 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo = getAuthRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error) {
        setMessage(
          error.message.includes('provider')
            ? 'Google 로그인 설정을 확인해 주세요. Supabase Dashboard → Authentication → Providers → Google'
            : error.message,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">FC</span>
          <div>
            <h1>FitCheck</h1>
            <p>Member</p>
          </div>
        </div>

        <h2>로그인</h2>
        <p className="auth-sub">운동·식단·헬스장 매칭을 한 계정으로 이어갑니다.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>이메일</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-field-label-row">
              <span>비밀번호</span>
              <Link to="/forgot-password" className="auth-inline-link">
                비밀번호 찾기
              </Link>
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {message ? <p className="auth-message">{message}</p> : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <div className="auth-divider">또는</div>

        <button
          type="button"
          className="btn btn-secondary auth-google-btn"
          disabled={submitting}
          onClick={() => void handleGoogleSignIn()}
        >
          <GoogleIcon />
          Google로 계속하기
        </button>

        <p className="auth-footer">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
