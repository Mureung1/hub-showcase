import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import AuthForm from '../features/auth/components/AuthForm'
import { signInWithUsername, signUpWithUsername } from '../features/auth/lib/authApi'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(values: { username: string; password: string }) {
    setAuthError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUpWithUsername(values.username, values.password)
      } else {
        await signInWithUsername(values.username, values.password)
      }
      navigate('/')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '문제가 발생했어요. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background: 'var(--color-bg-page)',
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(34,211,238,0.08), transparent 55%)',
      }}
    >
      <div className="w-full max-w-[360px]">
        <div className="mb-5 flex items-center justify-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-[7px]"
            style={{
              background: 'var(--color-accent-fill)',
              color: 'var(--color-accent)',
              boxShadow: '0 0 14px rgba(34,211,238,0.35)',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <circle cx="8" cy="3" r="1.4" />
              <line x1="8" y1="4.4" x2="4.3" y2="8" />
              <line x1="8" y1="4.4" x2="11.7" y2="8" />
              <circle cx="4.3" cy="9.4" r="1.4" />
              <circle cx="11.7" cy="9.4" r="1.4" />
            </svg>
          </span>
          <span className="text-[13.5px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            시각화 학습실
          </span>
        </div>

        <Card>
          <h1 className="text-center text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {mode === 'login' ? '로그인' : '회원가입'}
          </h1>
          <p className="mb-5 mt-1 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {mode === 'login'
              ? '기기 간 Q&A 기록을 이어보려면 로그인하세요.'
              : '아이디와 비밀번호만으로 간단하게 가입해요.'}
          </p>

          <AuthForm
            mode={mode}
            onSubmit={handleSubmit}
            submitting={submitting}
            errorMessage={authError}
          />

          <div className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setAuthError(null)
              }}
              className="font-medium"
              style={{ color: 'var(--color-accent-text)' }}
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
