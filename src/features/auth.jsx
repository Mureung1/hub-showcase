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
        <p className="eyebrow">Cafe Stamp MVP</p>
        <h1>카페 스탬프를 웹에서 가볍게 관리해요</h1>
        <p>
          손님은 QR을 보여주고, 사장님은 가게 화면에서 스탬프를 적립합니다.
        </p>
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

          <button className="primary-button" type="submit">
            {loginStatus === 'loading' ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </section>
    </main>
  )
}



export { RoleLogin }
