import { useState, type FormEvent } from 'react'
import TextField from './TextField'

interface AuthFormProps {
  mode: 'login' | 'signup'
  onSubmit: (values: { username: string; password: string }) => void
  submitting?: boolean
  errorMessage?: string | null
}

interface FormErrors {
  username?: string
  password?: string
  confirmPassword?: string
}

export default function AuthForm({ mode, onSubmit, submitting, errorMessage }: AuthFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const nextErrors: FormErrors = {}
    if (!username.trim()) nextErrors.username = '아이디를 입력해주세요.'
    if (!password) nextErrors.password = '비밀번호를 입력해주세요.'
    if (mode === 'signup' && password !== confirmPassword) {
      nextErrors.confirmPassword = '비밀번호가 일치하지 않아요.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({ username, password })
  }

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="아이디"
        value={username}
        onChange={setUsername}
        placeholder={mode === 'login' ? '아이디 입력' : '사용할 아이디'}
        error={errors.username}
        autoComplete="username"
      />
      <TextField
        label="비밀번호"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="비밀번호 입력"
        error={errors.password}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />
      {mode === 'signup' && (
        <TextField
          label="비밀번호 확인"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="비밀번호 다시 입력"
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
      )}
      {errorMessage && (
        <p className="mb-3 text-center text-[11.5px]" style={{ color: 'var(--color-danger-text)' }}>
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-1.5 h-[42px] w-full rounded-[var(--radius-pill)] text-[13.5px] font-medium disabled:opacity-50"
        style={{ background: 'var(--color-accent)', color: '#06232a', boxShadow: 'var(--shadow-glow-accent)' }}
      >
        {submitting ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
      </button>
    </form>
  )
}
