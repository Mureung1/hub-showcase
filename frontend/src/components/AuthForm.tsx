import { useState } from 'react';
import type { FormEvent } from 'react';
import { login, signup } from '../api/auth';
import type { LoginResponse } from '../api/auth';

interface AuthFormProps {
  onLoggedIn: (result: LoginResponse) => void;
  notice?: string | null;
}

type Mode = 'login' | 'signup';

export function AuthForm({ onLoggedIn, notice }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, name);
      }
      const result = await login(email, password);
      onLoggedIn(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setError(null);
  }

  return (
    <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {notice && <div className="warn-box">{notice}</div>}
      <div
        className="card"
        style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}
      >
        <span className="icon-badge-lg">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 20c8 0 14-6 16-16-10 2-16 8-16 16Z"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <h1 className="heading" style={{ fontSize: 19, marginBottom: 4 }}>
            {mode === 'login' ? '로그인' : '회원가입'}
          </h1>
          <p className="sub">green-connect에 오신 것을 환영해요</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}
        >
          {mode === 'signup' && (
            <input
              className="text-input"
              type="text"
              placeholder="이름 (선택)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="text-input"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="text-input"
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="warn-box">{error}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        {mode === 'login' && (
          <a href="#" style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
            비밀번호를 잊으셨나요?
          </a>
        )}
      </div>

      <button className="btn-outline" type="button" onClick={toggleMode}>
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>

      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
        {mode === 'login' ? '로그인' : '회원가입'}하면 green-connect의
        <br />
        이용약관과 개인정보 처리방침에 동의하게 돼요
      </p>
    </div>
  );
}
