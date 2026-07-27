import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, ChevronLeft, Check, AlertCircle } from 'lucide-react'
import { login, signup } from '../lib/api'

type AuthView = 'login' | 'signup' | 'verify'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: 'linear-gradient(135deg, #4F8EF7 0%, #6B5CF0 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(79,142,247,0.35)',
      }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-1px', fontFamily: 'Pretendard' }}>S</span>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.5px' }}>SpendMate</p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>AI 소비 코치</p>
      </div>
    </div>
  )
}

function InputField({
  type = 'text', placeholder, value, onChange, icon, right, error,
}: {
  type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; icon: React.ReactNode;
  right?: React.ReactNode; error?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'white', border: `1.5px solid ${error ? '#FF6B6B' : 'var(--border)'}`,
        borderRadius: 16, padding: '0 16px', height: 56,
        transition: 'border-color 0.15s',
        boxShadow: error ? '0 0 0 3px rgba(255,107,107,0.1)' : 'none',
      }}>
        <span style={{ color: error ? '#FF6B6B' : 'var(--muted)', flexShrink: 0 }}>{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 15, color: 'var(--foreground)', fontFamily: 'Pretendard',
            fontWeight: 500,
          }}
        />
        {right}
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={12} color="#FF6B6B" />
          <span style={{ fontSize: 12, color: '#FF6B6B', fontWeight: 500 }}>{error}</span>
        </div>
      )}
    </div>
  )
}

/* ── 로그인 ── */
function LoginView({ onLogin, onGoSignup }: { onLogin: () => void; onGoSignup: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: typeof errors = {}
    if (!email) e.email = '이메일을 입력해주세요'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '올바른 이메일 형식이 아니에요'
    if (!password) e.password = '비밀번호를 입력해주세요'
    else if (password.length < 6) e.password = '비밀번호는 6자 이상이어야 해요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await login(email, password)
      onLogin()
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : '로그인에 실패했어요.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 24px' }}>
      {/* Top spacer */}
      <div style={{ flex: 1 }} />

      {/* Logo */}
      <div style={{ marginBottom: 36 }}>
        <Logo />
        <p style={{ margin: '16px 0 0', fontSize: 26, fontWeight: 900, color: 'var(--foreground)', lineHeight: 1.3 }}>
          안녕하세요!<br />
          <span style={{ color: '#4F8EF7' }}>다시 오셨군요 👋</span>
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          이메일로 로그인하고 오늘의 소비를<br />AI 코치와 함께 관리해보세요.
        </p>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <InputField
          type="email"
          placeholder="이메일 주소"
          value={email}
          onChange={setEmail}
          icon={<Mail size={18} />}
          error={errors.email}
        />
        <InputField
          type={showPw ? 'text' : 'password'}
          placeholder="비밀번호"
          value={password}
          onChange={setPassword}
          icon={<Lock size={18} />}
          error={errors.password}
          right={
            <button
              onClick={() => setShowPw(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
      </div>

      {/* Forgot password */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#4F8EF7', fontWeight: 600, fontFamily: 'Pretendard' }}>
          비밀번호를 잊으셨나요?
        </button>
      </div>

      {/* Login Button */}
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          height: 56, borderRadius: 18, border: 'none', cursor: loading ? 'default' : 'pointer',
          fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800,
          background: email && password ? 'linear-gradient(135deg, #4F8EF7 0%, #6B5CF0 100%)' : '#E5E7EB',
          color: email && password ? 'white' : '#9CA3AF',
          boxShadow: email && password ? '0 4px 20px rgba(79,142,247,0.35)' : 'none',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 18, height: 18, borderRadius: 99, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
            로그인 중...
          </>
        ) : '로그인'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>또는</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Signup link */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>아직 계정이 없으신가요? </span>
        <button
          onClick={onGoSignup}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#4F8EF7', fontFamily: 'Pretendard' }}
        >
          회원가입
        </button>
      </div>

      {/* Bottom spacer */}
      <div style={{ flex: 1.5 }} />
    </div>
  )
}

/* ── 회원가입 ── */
function SignupView({ onSignup, onBack }: { onSignup: () => void; onBack: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '이름을 입력해주세요'
    if (!email) e.email = '이메일을 입력해주세요'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '올바른 이메일 형식이 아니에요'
    if (!password) e.password = '비밀번호를 입력해주세요'
    else if (password.length < 8) e.password = '비밀번호는 8자 이상이어야 해요'
    if (!confirm) e.confirm = '비밀번호를 한 번 더 입력해주세요'
    else if (password !== confirm) e.confirm = '비밀번호가 일치하지 않아요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignup = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await signup(email, password, name)
      onSignup()
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : '회원가입에 실패했어요.' })
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabel = ['', '약함', '보통', '강함']
  const strengthColor = ['', '#FF6B6B', '#FFC857', '#6ED6C8']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }} className="no-scrollbar">
      <div style={{ padding: '8px 24px 0', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', fontSize: 15, fontWeight: 700, fontFamily: 'Pretendard', minHeight: 44, padding: '0 0 0 0' }}
        >
          <ChevronLeft size={20} /> 뒤로
        </button>
      </div>

      <div style={{ padding: '16px 24px 40px' }}>
        {/* Heading */}
        <div style={{ marginBottom: 32 }}>
          <Logo />
          <p style={{ margin: '16px 0 4px', fontSize: 26, fontWeight: 900, color: 'var(--foreground)' }}>
            회원가입
          </p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
            이메일로 간편하게 시작해보세요
          </p>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <InputField
            placeholder="이름"
            value={name}
            onChange={setName}
            icon={<User size={18} />}
            error={errors.name}
          />
          <InputField
            type="email"
            placeholder="이메일 주소"
            value={email}
            onChange={setEmail}
            icon={<Mail size={18} />}
            error={errors.email}
          />
          <div>
            <InputField
              type={showPw ? 'text' : 'password'}
              placeholder="비밀번호 (8자 이상)"
              value={password}
              onChange={setPassword}
              icon={<Lock size={18} />}
              error={errors.password}
              right={
                <button onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            {/* Password strength */}
            {password.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= pwStrength ? strengthColor[pwStrength] : 'var(--border)', transition: 'background 0.3s' }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: strengthColor[pwStrength] }}>{strengthLabel[pwStrength]}</span>
              </div>
            )}
          </div>
          <InputField
            type={showConfirm ? 'text' : 'password'}
            placeholder="비밀번호 확인"
            value={confirm}
            onChange={setConfirm}
            icon={<Lock size={18} />}
            error={errors.confirm}
            right={
              confirm && !errors.confirm && confirm === password
                ? <Check size={18} color="#6ED6C8" />
                : (
                  <button onClick={() => setShowConfirm(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex' }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )
            }
          />
        </div>

        {/* Terms */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid var(--border)', marginBottom: 24 }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>가입 시 동의사항</p>
          {['서비스 이용약관 (필수)', '개인정보 처리방침 (필수)', '마케팅 정보 수신 (선택)'].map((t, i) => (
            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t}</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#4F8EF7', fontFamily: 'Pretendard' }}>보기</button>
            </div>
          ))}
        </div>

        {/* Signup Button */}
        <button
          onClick={handleSignup}
          disabled={loading}
          style={{
            width: '100%', height: 56, borderRadius: 18, border: 'none',
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800,
            background: name && email && password && confirm
              ? 'linear-gradient(135deg, #4F8EF7 0%, #6B5CF0 100%)'
              : '#E5E7EB',
            color: name && email && password && confirm ? 'white' : '#9CA3AF',
            boxShadow: name && email && password && confirm ? '0 4px 20px rgba(79,142,247,0.35)' : 'none',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 18, height: 18, borderRadius: 99, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
              가입 중...
            </>
          ) : '회원가입 완료'}
        </button>

        {/* Login link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>이미 계정이 있으신가요? </span>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, color: '#4F8EF7', fontFamily: 'Pretendard' }}>
            로그인
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 이메일 인증 완료 ── */
function VerifyView({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 32px', textAlign: 'center' }}>
      <div style={{
        width: 88, height: 88, borderRadius: 28,
        background: 'linear-gradient(135deg, #E8F8F6, #EBF2FF)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(110,214,200,0.3)',
      }}>
        <span style={{ fontSize: 44 }}>🎉</span>
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: 'var(--foreground)' }}>
        가입 완료!
      </h2>
      <p style={{ margin: '0 0 32px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
        SpendMate에 오신 걸 환영해요.<br />
        AI 코치와 함께 스마트하게<br />소비를 관리해보세요! 💪
      </p>

      {/* Feature highlights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginBottom: 36 }}>
        {[
          { emoji: '🤖', text: 'AI가 소비 패턴을 분석해드려요' },
          { emoji: '📸', text: '영수증 촬영 한 번으로 자동 입력' },
          { emoji: '💰', text: '생존모드로 월말도 거뜬하게' },
        ].map(({ emoji, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 14, padding: '12px 16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: 22 }}>{emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        style={{
          width: '100%', height: 56, borderRadius: 18, border: 'none', cursor: 'pointer',
          fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800,
          background: 'linear-gradient(135deg, #4F8EF7 0%, #6B5CF0 100%)',
          color: 'white', boxShadow: '0 4px 20px rgba(79,142,247,0.35)',
        }}
      >
        시작하기 🚀
      </button>
    </div>
  )
}

/* ── Main AuthScreen ── */
export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [view, setView] = useState<AuthView>('login')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
      {view === 'login' && <LoginView onLogin={onAuth} onGoSignup={() => setView('signup')} />}
      {view === 'signup' && <SignupView onSignup={() => setView('verify')} onBack={() => setView('login')} />}
      {view === 'verify' && <VerifyView onContinue={onAuth} />}
    </div>
  )
}
