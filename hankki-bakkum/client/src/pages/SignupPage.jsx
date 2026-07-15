// docs/prototype-auth-redeem.html ⑧ 참고. 역할(학생/사장님) 선택이 첫 필드
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function SignupPage() {
  const [role, setRole] = useState(null);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSignup() {
    if (!role) return setError('역할을 먼저 선택해 주세요');
    if (!nickname || !email || password.length < 6)
      return setError('모든 칸을 채워 주세요 (비밀번호 6자 이상)');

    const { data, error: e1 } = await supabase.auth.signUp({ email, password });
    if (e1) return setError('가입 실패: ' + e1.message);

    const { error: e2 } = await supabase.from('users').insert({
      id: data.user.id, role, nickname, region: '부산대 앞',
    });
    if (e2) return setError('프로필 저장 실패: ' + e2.message);

    navigate('/');
  }

  const roleBtn = (v) => ({
    flex: 1, minHeight: 64, borderRadius: 14, border: 'none',
    fontWeight: 700, fontSize: '.95rem', cursor: 'pointer',
    background: role === v ? 'var(--primary-soft)' : 'var(--bg-section)',
    color: role === v ? 'var(--primary)' : 'var(--muted)',
  });
  const input = {
    width: '100%', minHeight: 48, borderRadius: 14, border: 'none',
    background: 'var(--bg-section)', padding: '0 16px', fontSize: '.95rem',
    color: 'var(--ink)', marginBottom: 12, boxSizing: 'border-box',
  };

  return (
    <section style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
      <h1 className="sec-title">회원가입</h1>
      <p className="sec-cap" style={{ marginBottom: 24 }}>
        어떤 분인지 먼저 알려주세요
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button style={roleBtn('student')} onClick={() => setRole('student')}>
          🎓 학생 헬퍼
        </button>
        <button style={roleBtn('owner')} onClick={() => setRole('owner')}>
          🍚 사장님
        </button>
      </div>

      <input style={input} placeholder="닉네임"
        value={nickname} onChange={(e) => setNickname(e.target.value)} />
      <input style={input} placeholder="이메일" type="email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={input} placeholder="비밀번호 (6자 이상)" type="password"
        value={password} onChange={(e) => setPassword(e.target.value)} />

      {error && <p style={{ color: 'var(--hot)', fontSize: '.84rem' }}>{error}</p>}

      <button onClick={handleSignup} style={{
        width: '100%', minHeight: 48, borderRadius: 14, border: 'none',
        background: 'var(--primary-soft)', color: 'var(--primary)',
        fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 8,
      }}>
        가입하기
      </button>
    </section>
  );
}