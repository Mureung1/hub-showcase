import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../services/supabaseClient';
import { formatAuthError } from '../../utils/authHelpers';
import './auth.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase Auth 설정이 없습니다.');
      return;
    }

    const authClient = supabase;
    let cancelled = false;

    async function prepareRecoverySession() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error: exchangeError } = await authClient.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setError(formatAuthError(exchangeError.message));
          return;
        }
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await authClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError && !cancelled) {
          setError(formatAuthError(sessionError.message));
          return;
        }
      }

      const { data, error: sessionLookupError } = await authClient.auth.getSession();
      if (sessionLookupError && !cancelled) {
        setError(formatAuthError(sessionLookupError.message));
        return;
      }

      if (data.session && !cancelled) {
        setReady(true);
      }
    }

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && !cancelled) {
        setReady(true);
      }
    });

    void prepareRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Supabase Auth 설정이 없습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setMessage(formatAuthError(updateError.message));
        return;
      }

      navigate('/user/account', {
        replace: true,
        state: { passwordUpdated: true },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>링크를 확인할 수 없습니다</h2>
          <p className="auth-message">{error}</p>
          <p className="auth-sub">링크가 만료되었거나 이미 사용되었을 수 있습니다.</p>
          <Link to="/forgot-password" className="btn btn-primary">
            다시 요청하기
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="auth-callback">
        <p>비밀번호 재설정 준비 중…</p>
      </div>
    );
  }

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

        <h2>새 비밀번호 설정</h2>
        <p className="auth-sub">이메일/비밀번호 로그인에 사용할 새 비밀번호를 입력해 주세요.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>새 비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          <label className="auth-field">
            <span>새 비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {message ? <p className="auth-message">{message}</p> : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '저장 중…' : '비밀번호 저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
