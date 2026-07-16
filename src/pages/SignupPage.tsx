import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../api/client.ts'

function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

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
          이름
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            value={name}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          별명
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            onChange={(e) => setNickname(e.target.value)}
            required
            type="text"
            value={nickname}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
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
          비밀번호 확인
          <input
            className="rounded-lg border border-border bg-card px-3 py-2"
            minLength={8}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            type="password"
            value={passwordConfirm}
          />
        </label>
        {error && <p className="text-sm text-accent">{error}</p>}
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
    </main>
  )
}

export default SignupPage
