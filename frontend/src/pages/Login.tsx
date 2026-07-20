import { FormEvent, useState } from 'react'
import './Login.css'

export default function Login() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
          <label className="login-form__field">
            <span>아이디</span>
            <input
              type="text"
              name="userId"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="아이디를 입력해주세요"
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

          <button className="login-form__submit" type="submit">
            로그인
          </button>
        </form>

        <button className="login-card__signup" type="button">
          아직 회원이 아니신가요? <strong>회원가입</strong>
        </button>
      </section>
    </main>
  )
}
