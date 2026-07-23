import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api/client.ts'
import Layout from '../components/Layout.tsx'

const TERMS_TEXT =
  '본 서비스(챌린지로그)는 개인 사이드 프로젝트입니다. 가입 시 입력한 이메일·이름·별명은 서비스 제공(로그인, 친구 방 표시) 목적으로만 사용되며, 제3자에게 제공되지 않습니다. 작성한 사진과 기록은 본인과 소속된 친구 방 멤버만 볼 수 있습니다.'

const PASSWORD_RULE_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/

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

    if (!PASSWORD_RULE_REGEX.test(password)) {
      setError('비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.')
      return
    }

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
    <Layout hideNav title="회원가입">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="name">
            이름 <span className="text-accent">*</span>
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="name"
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            value={name}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="nickname">
            별명 <span className="text-accent">*</span>{' '}
            <span className="text-xs font-normal text-muted">(친구 방에서 다른 멤버에게 보이는 이름이에요)</span>
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="nickname"
            onChange={(e) => setNickname(e.target.value)}
            required
            type="text"
            value={nickname}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="email">
            이메일 <span className="text-accent">*</span>
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="password">
            비밀번호 <span className="text-accent">*</span>{' '}
            <span className="text-xs font-normal text-muted">(8자 이상, 영문+숫자 포함)</span>
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="password"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[13px] font-semibold text-heading" htmlFor="passwordConfirm">
              비밀번호 확인 <span className="text-accent">*</span>
            </label>
            {showMatchHint &&
              (passwordsMatch ? (
                <span className="text-xs text-done">✓ 일치합니다</span>
              ) : (
                <span className="text-xs text-accent">✗ 일치하지 않습니다</span>
              ))}
          </div>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="passwordConfirm"
            minLength={8}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            type="password"
            value={passwordConfirm}
          />
        </div>
        {error && !showTermsModal && <p className="text-sm text-accent">{error}</p>}
        <button
          className="w-full rounded-full bg-accent px-5 py-[13px] text-[15px] font-semibold text-white disabled:opacity-50"
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
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-[17px] text-heading">이용약관 동의</h2>
            <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-border p-3 text-sm text-muted">
              {TERMS_TEXT}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-heading">
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
                className="flex-1 rounded-full border border-border px-4 py-3 text-[15px] font-semibold text-heading"
                onClick={handleCancelTerms}
                type="button"
              >
                취소
              </button>
              <button
                className="flex-1 rounded-full bg-accent px-4 py-3 text-[15px] font-semibold text-white disabled:opacity-50"
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
    </Layout>
  )
}

export default SignupPage
