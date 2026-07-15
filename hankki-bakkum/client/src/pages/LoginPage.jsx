import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin() {
    if (!email || !password) return setError('이메일과 비밀번호를 입력해 주세요');

    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) return setError('로그인 실패: 이메일 또는 비밀번호를 확인해 주세요');

    navigate('/');
  }

  const input = {
    width: '100%', minHeight: 48, borderRadius: 14, border: 'none',
    background: 'var(--bg-section)', padding: '0 16px', fontSize: '.95rem',
    color: 'var(--ink)', marginBottom: 12, boxSizing: 'border-box',
  };

  return (
    <section style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
      <h1 className="sec-title">로그인</h1>
      <p className="sec-cap" style={{ marginBottom: 24 }}>다시 만나서 반가워요</p>

      <input style={input} placeholder="이메일" type="email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={input} placeholder="비밀번호" type="password"
        value={password} onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />

      {error && <p style={{ color: 'var(--hot)', fontSize: '.84rem' }}>{error}</p>}

      <button onClick={handleLogin} style={{
        width: '100%', minHeight: 48, borderRadius: 14, border: 'none',
        background: 'var(--primary-soft)', color: 'var(--primary)',
        fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 8,
      }}>
        로그인
      </button>

      <p style={{ fontSize: '.84rem', color: 'var(--muted)', textAlign: 'center', marginTop: 16 }}>
        아직 계정이 없다면 <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 700 }}>회원가입</Link>
      </p>
    </section>
  );
}