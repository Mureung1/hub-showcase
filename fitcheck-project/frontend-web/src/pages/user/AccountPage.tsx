import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getSupabaseClient } from '../../services/supabaseClient';
import { formatAuthError, providerLabel } from '../../utils/authHelpers';
import './user.css';
import './account.css';

export default function AccountPage() {
  const location = useLocation();
  const { session } = useAuth();
  const [providers, setProviders] = useState<string[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const email = session?.user.email ?? '';
  const hasEmailLogin = providers.includes('email');
  const hasGoogleLogin = providers.includes('google');

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoadingProviders(false);
      return;
    }

    void supabase.auth.getUserIdentities().then(({ data, error }) => {
      if (error || !data?.identities) {
        setProviders([]);
      } else {
        setProviders(data.identities.map((identity) => identity.provider));
      }
      setLoadingProviders(false);
    });
  }, []);

  useEffect(() => {
    const state = location.state as { passwordUpdated?: boolean } | null;
    if (state?.passwordUpdated) {
      setSuccess(true);
      setMessage('비밀번호가 저장되었습니다. 이제 Google과 이메일/비밀번호 로그인을 모두 사용할 수 있습니다.');
    }
  }, [location.state]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSuccess(false);

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
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setSuccess(true);
      setMessage(
        hasEmailLogin
          ? '비밀번호가 변경되었습니다.'
          : '비밀번호가 설정되었습니다. 이제 Google과 이메일/비밀번호 로그인을 모두 사용할 수 있습니다.',
      );

      if (!hasEmailLogin) {
        setProviders((current) => [...new Set([...current, 'email'])]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="user-page account-page">
      <header className="account-header">
        <h1>계정 설정</h1>
        <p className="account-sub">로그인 방식과 비밀번호를 관리합니다.</p>
      </header>

      <section className="showcase-card account-card">
        <h2 className="showcase-section-title">내 계정</h2>
        <dl className="account-info">
          <div>
            <dt>이메일</dt>
            <dd>{email || '—'}</dd>
          </div>
          <div>
            <dt>연결된 로그인</dt>
            <dd>
              {loadingProviders ? (
                '확인 중…'
              ) : providers.length > 0 ? (
                <ul className="account-provider-list">
                  {providers.map((provider) => (
                    <li key={provider}>{providerLabel(provider)}</li>
                  ))}
                </ul>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>

        {hasGoogleLogin && !hasEmailLogin ? (
          <p className="account-hint">
            Google로 가입한 계정입니다. 아래에서 비밀번호를 설정하면 이메일/비밀번호 로그인도 사용할
            수 있습니다.
          </p>
        ) : null}
      </section>

      <section className="showcase-card account-card">
        <h2 className="showcase-section-title">
          {hasEmailLogin ? '비밀번호 변경' : '비밀번호 설정'}
        </h2>

        <form className="account-form" onSubmit={handleSubmit}>
          <label className="account-field">
            <span>{hasEmailLogin ? '새 비밀번호' : '비밀번호'}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>
          <label className="account-field">
            <span>비밀번호 확인</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {message ? (
            <p className={`account-message${success ? ' account-message-success' : ''}`}>{message}</p>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '저장 중…' : hasEmailLogin ? '비밀번호 변경' : '비밀번호 설정'}
          </button>
        </form>

        <p className="account-footer">
          메일로 재설정하려면 <Link to="/forgot-password">비밀번호 찾기</Link>
        </p>
      </section>
    </div>
  );
}
