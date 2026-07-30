import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getSupabaseClient } from '../../services/supabaseClient';
import { formatAuthError } from '../../utils/authHelpers';
import { getPasswordResetRedirectUrl } from '../../utils/authRedirect';
import './auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSuccess(false);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Supabase Auth 설정이 없습니다. .env.local을 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }

      setSuccess(true);
      setMessage(
        '비밀번호 재설정 메일을 보냈습니다. Google로만 가입한 계정도 이 메일로 이메일/비밀번호 로그인을 설정할 수 있습니다.',
      );
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

        <h2>비밀번호 찾기</h2>
        <p className="auth-sub">
          가입한 이메일로 재설정 링크를 보내드립니다. Google로 가입한 계정도 같은 이메일로 비밀번호를
          설정할 수 있습니다.
        </p>

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

          {message ? (
            <p className={`auth-message${success ? ' auth-message-success' : ''}`}>{message}</p>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '전송 중…' : '재설정 메일 보내기'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
