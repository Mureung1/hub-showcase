import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { updateMyProfile } from '../../services/profileApi';
import { getSupabaseClient } from '../../services/supabaseClient';
import { formatAuthError, isDuplicateSignup } from '../../utils/authHelpers';
import './auth.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/user" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSuccess(false);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setMessage('이름을 입력해 주세요.');
      return;
    }
    if (!trimmedPhone) {
      setMessage('연락처를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      setMessage('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage('Supabase Auth 설정이 없습니다. .env.local을 확인해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: trimmedName,
            full_name: trimmedName,
            phone: trimmedPhone,
          },
        },
      });

      if (error) {
        setMessage(formatAuthError(error.message));
        return;
      }

      if (isDuplicateSignup(data.user)) {
        setMessage(
          '이미 가입된 이메일입니다. Google로 가입하셨다면 Google 로그인을 이용하거나, 비밀번호 찾기로 이메일 로그인을 설정해 주세요.',
        );
        return;
      }

      if (data.session) {
        try {
          await updateMyProfile({ name: trimmedName, phone: trimmedPhone });
          await refreshProfile();
        } catch {
          // profiles trigger or GET /me may still populate on first load
        }
        navigate('/user', { replace: true });
        return;
      }

      setSuccess(true);
      setMessage('가입이 완료되었습니다. 이메일 확인 후 로그인해 주세요.');
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

        <h2>회원가입</h2>
        <p className="auth-sub">기본 정보를 입력하고 FitCheck를 시작하세요.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>이름</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>연락처</span>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="010-1234-5678"
              required
            />
          </label>
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
            <span>비밀번호</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {message ? (
            <p className={`auth-message${success ? ' auth-message-success' : ''}`}>{message}</p>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '가입 중…' : '회원가입'}
          </button>
        </form>

        <p className="auth-footer">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          {' · '}
          <Link to="/forgot-password">비밀번호 찾기</Link>
        </p>
      </div>
    </div>
  );
}
