// 로그인/가입 — supabase-js auth 전용 (데이터 요청은 전부 FastAPI 경유, api.ts 참고)
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import styles from './pages.module.css';

export const LoginPage: React.FC = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 맞지 않아요.'
          : err.message.includes('already registered')
            ? '이미 가입된 이메일이에요 — 로그인해주세요.'
            : `요청이 실패했어요: ${err.message}`,
      );
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className={[styles.page, styles.centered].join(' ')}>
      <h1 className={styles.brand}>Tax<em>Wiz</em></h1>
      <p className={styles.lead}>연간결산·세무조정, 질문에 하나씩 답하면 끝나요.</p>

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="login-email">이메일</label>
          <input
            id="login-email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="login-pw">비밀번호</label>
          <input
            id="login-pw" type="password" required minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상"
          />
        </div>
        <button type="submit" className={styles.primaryBtn} disabled={busy}>
          {busy ? '잠시만요…' : mode === 'login' ? '로그인' : '가입하기'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>

      <div className={styles.switchRow}>
        {mode === 'login' ? (
          <>처음이신가요? <button type="button" onClick={() => { setMode('signup'); setError(null); }}>가입하기</button></>
        ) : (
          <>계정이 있으신가요? <button type="button" onClick={() => { setMode('login'); setError(null); }}>로그인</button></>
        )}
      </div>
    </div>
  );
};
