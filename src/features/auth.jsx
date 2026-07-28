import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services'

function RoleLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginStatus, setLoginStatus] = useState('idle')
  const [loginError, setLoginError] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginStatus('loading')
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginStatus('idle')
      setLoginError('이메일 또는 비밀번호를 확인해 주세요.')
      return
    }

    setLoginStatus('idle')
    navigate('/customer')
  }

  return (
    <main className="app-shell role-screen">
      <section className="role-intro">
        <div className="login-card-title">
          <h1>Moang</h1>
          <p>스탬프를 모아봐요</p>
        </div>
      </section>

      <section className="role-actions" aria-label="로그인">
        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />

          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {loginError && <p className="form-error">{loginError}</p>}

          <button className="primary-button" type="submit" disabled={loginStatus === 'loading'}>
            {loginStatus === 'loading' ? '로그인 중' : '로그인'}
          </button>
        </form>
      </section>
      <p className="login-copy">자주 가는 카페의 스탬프와 쿠폰을 한곳에서 확인해요.</p>
    </main>
  )
}

export { RoleLogin }
