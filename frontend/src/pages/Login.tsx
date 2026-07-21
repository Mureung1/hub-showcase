import { FormEvent, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { login } from '../api/auth'
import './Login.css'

export default function Login() {
  const location = useLocation()
  const signupMessage = (location.state as { message?: string } | null)?.message
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await login(userId.trim(), password)
      window.location.assign('/app')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__heading">
          <span className="login-card__eyebrow">취향으로 찾는 나만의 맛집</span>
          <h1 id="login-title" className="login-card__logo">
            Taste<span>Fit</span>
          </h1>
          <p>당신의 취향에 꼭 맞는 장소를 만나보세요.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {signupMessage && <p className="login-form__success">{signupMessage}</p>}
          <label className="login-form__field">
            <span>아이디</span>
            <input
              type="email"
              name="userId"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="이메일을 입력해주세요"
              autoComplete="username"
            />
          </label>

          <label className="login-form__field">
            <span>비밀번호</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력해주세요"
              autoComplete="current-password"
            />
          </label>

          {error && <p role="alert">{error}</p>}

          <button className="login-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <Link className="login-card__signup" to="/signup">
          아직 회원이 아니신가요? <strong>회원가입</strong>
        </Link>
      </section>
    </main>
  )
}
