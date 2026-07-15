import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, setToken } from '../api/client.ts'

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
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <h1 className="text-center text-2xl">로그인</h1>
      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
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
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          className="rounded-lg bg-accent px-4 py-2 text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          로그인
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        계정이 없으신가요? <Link className="text-accent" to="/signup">회원가입</Link>
      </p>
    </main>
  )
}

export default LoginPage
