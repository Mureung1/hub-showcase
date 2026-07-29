import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getSupabaseClient } from '../../services/supabaseClient';
import { getAuthRedirectUrl, getSiteOrigin } from '../../utils/authRedirect';
import './auth.css';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Supabase Auth 설정이 없습니다.');
      return;
    }

    let cancelled = false;

    async function finish() {
      if (!supabase) return;

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const oauthError =
        params.get('error_description') ??
        params.get('error') ??
        hashParams.get('error_description') ??
        hashParams.get('error');

      if (oauthError) {
        if (!cancelled) {
          setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
        }
        return;
      }

      const code = params.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setError(exchangeError.message);
          return;
        }
      }

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error: sessionSetError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionSetError && !cancelled) {
          setError(sessionSetError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) setError(sessionError.message);
        return;
      }

      if (data.session && !cancelled) {
        navigate('/user', { replace: true });
      } else if (!cancelled) {
        setError('로그인 세션을 확인하지 못했습니다. 다시 시도해 주세요.');
      }
    }

    void finish();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/user', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>로그인 실패</h2>
          <p className="auth-message">{error}</p>
          <p className="auth-sub">
            Supabase Dashboard → Authentication → URL Configuration에서 아래를 확인해 주세요.
            <br />
            <strong>Site URL:</strong> <code>{getSiteOrigin()}</code>
            <br />
            <strong>Redirect URLs:</strong>{' '}
            <code>{getAuthRedirectUrl()}</code>
            <br />
            (로컬 개발 시 <code>http://localhost:5173/auth/callback</code> 도 추가)
          </p>
          <Link to="/login" className="btn btn-primary">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback">
      <p>Google 로그인 처리 중…</p>
    </div>
  );
}
