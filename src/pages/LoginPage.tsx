import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMe, login, setToken } from '../api/client.ts'
import Layout from '../components/Layout.tsx'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { token } = await login({ email, password })
      setToken(token)

      const me = await getMe()
      navigate(me.onboardingCompleted ? '/' : '/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout hideNav title="로그인">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-heading" htmlFor="email">
            이메일
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
            비밀번호
          </label>
          <input
            className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-heading"
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          className="w-full rounded-full bg-accent px-5 py-[13px] text-[15px] font-semibold text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          로그인
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        계정이 없으신가요? <Link className="text-accent" to="/signup">회원가입</Link>
      </p>
    </Layout>
  )
}

export default LoginPage
