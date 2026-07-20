import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { status, signIn, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [status, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch {
      // 에러는 AuthContext의 error 상태로 이미 반영됨
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface flex items-center justify-center">
      {/* 로고 위 국소 그라데이션 (primary → transparent, linear top→bottom) */}
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

      <div className="relative w-full max-w-sm flex flex-col items-center px-6">
        <div className="mb-stack-lg flex flex-col items-center">
          <span className="font-display-lg text-display-lg text-on-surface">Newssist</span>
          <span className="mt-1 font-label-mono text-label-mono uppercase tracking-wide text-primary">
            AI Intelligence
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded p-stack-lg bg-surface-container-lowest/20 backdrop-blur-lg shadow-[0_0_40px_rgba(15,23,42,0.15)]"
        >
          <h1 className="font-headline-sm text-headline-sm text-on-surface mb-stack-md">로그인</h1>

          {error && (
            <p className="font-body-md text-body-md text-error mb-stack-sm">{error}</p>
          )}

          <label className="block font-label-mono text-label-mono uppercase tracking-wide text-on-surface-variant mb-1">
            이메일
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-outline-variant rounded px-3 py-2 mb-stack-md font-body-md text-body-md bg-surface focus:outline-none focus:border-primary"
          />

          <label className="block font-label-mono text-label-mono uppercase tracking-wide text-on-surface-variant mb-1">
            비밀번호
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-outline-variant rounded px-3 py-2 mb-stack-lg font-body-md text-body-md bg-surface focus:outline-none focus:border-primary"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-on-primary rounded-lg py-2 font-body-md disabled:opacity-50"
          >
            로그인
          </button>

          <p className="mt-stack-md text-center font-body-md text-body-md text-on-surface-variant">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="text-primary underline">
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
