import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Signup() {
  const { status, signUp, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [status, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await signUp(email.trim().toLowerCase(), password);
      setSubmitted(true);
    } catch {
      // 에러는 AuthContext의 error 상태로 이미 반영됨
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-full max-w-sm border border-outline-variant rounded p-stack-lg bg-surface-container-lowest text-center">
          <h1 className="font-headline-md text-headline-md text-on-surface mb-stack-md">이메일을 확인해주세요</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {email.trim().toLowerCase()}로 인증 메일을 보냈어요. 메일함에서 링크를 눌러 가입을 완료해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-outline-variant rounded p-stack-lg bg-surface-container-lowest"
      >
        <h1 className="font-headline-md text-headline-md text-on-surface mb-stack-md">회원가입</h1>

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
          className="w-full border border-outline-variant rounded px-3 py-2 mb-stack-md font-body-md text-body-md"
        />

        <label className="block font-label-mono text-label-mono uppercase tracking-wide text-on-surface-variant mb-1">
          비밀번호
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-outline-variant rounded px-3 py-2 mb-stack-lg font-body-md text-body-md"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-on-primary rounded-lg py-2 font-body-md disabled:opacity-50"
        >
          회원가입
        </button>

        <p className="mt-stack-md text-center font-body-md text-body-md text-on-surface-variant">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary underline">
            로그인
          </Link>
        </p>
      </form>
    </div>
  );
}
