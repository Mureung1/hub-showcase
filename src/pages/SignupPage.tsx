import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api/client.ts'

const TERMS_TEXT =
  '본 서비스(챌린지로그)는 개인 사이드 프로젝트입니다. 가입 시 입력한 이메일·이름·별명은 서비스 제공(로그인, 친구 방 표시) 목적으로만 사용되며, 제3자에게 제공되지 않습니다. 작성한 사진과 기록은 본인과 소속된 친구 방 멤버만 볼 수 있습니다.'

function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const showMatchHint = passwordConfirm.length > 0
  const passwordsMatch = password === passwordConfirm

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setShowTermsModal(true)
  }

  function handleCancelTerms() {
    setShowTermsModal(false)
    setAgreedToTerms(false)
  }

  async function handleConfirmSignup() {
    setError(null)
    setIsSubmitting(true)

    try {
      await signup({ name, nickname, email, password })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="text-center text-2xl">회원가입</h1>
      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          <span>이름 <span className="text-accent">*</span></span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            value={name}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>별명 <span className="text-accent">*</span></span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            onChange={(e) => setNickname(e.target.value)}
            required
            type="text"
            value={nickname}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>이메일 <span className="text-accent">*</span></span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>비밀번호 <span className="text-accent">*</span></span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>비밀번호 확인 <span className="text-accent">*</span></span>
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            minLength={8}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            type="password"
            value={passwordConfirm}
          />
        </label>
        {showMatchHint &&
          (passwordsMatch ? (
            <p className="text-sm text-done">✓ 비밀번호가 일치합니다</p>
          ) : (
            <p className="text-sm text-accent">✗ 비밀번호가 일치하지 않습니다</p>
          ))}
        {error && !showTermsModal && <p className="text-sm text-accent">{error}</p>}
        <button
          className="rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          회원가입
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        이미 계정이 있으신가요? <Link className="text-accent" to="/login">로그인</Link>
      </p>

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6">
            <h2 className="text-lg font-semibold text-heading">이용약관 동의</h2>
            <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-border p-3 text-sm text-muted">
              {TERMS_TEXT}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                type="checkbox"
              />
              이용약관에 동의합니다
            </label>
            {error && <p className="mt-2 text-sm text-accent">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-lg border border-border px-4 py-2"
                onClick={handleCancelTerms}
                type="button"
              >
                취소
              </button>
              <button
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-50"
                disabled={!agreedToTerms || isSubmitting}
                onClick={handleConfirmSignup}
                type="button"
              >
                가입 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default SignupPage
