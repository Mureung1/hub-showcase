import { useState } from 'react'
import Card from '../components/Card'
import AuthForm from '../features/auth/components/AuthForm'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

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
            onSubmit={(values) => {
              console.log(`${mode === 'login' ? '로그인' : '회원가입'} 시도`, values)
            }}
          />

          <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            실제 로그인은 아직 준비 중이에요 (2주차 목표)
          </p>

          <div className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
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
