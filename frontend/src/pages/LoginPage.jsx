import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/authStore'
import logo from '../assets/logo.svg'
import loginBg from '../assets/illustrations/login-bg.png'
import loginCharacter from '../assets/illustrations/login-character.png'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const [loginStatus, setLoginStatus] = useState('')
  const login = useAuthStore((state) => state.login)

  const handleLogin = async () => {
    try {
      const response = await apiClient.post('/auth/login', {
        username: id,
        password,
      })
      const { token, userId, username, nickname, hasCompletedHobbyTest } = response.data
      console.log({ token, userId, username, nickname, hasCompletedHobbyTest })
      // authStore가 persist 미들웨어로 localStorage 저장까지 자동으로 처리해준다
      login(token, { userId, username, nickname })
      setLoginStatus('success')
      setLoginMessage('로그인 성공')
      setTimeout(() => {
        navigate(hasCompletedHobbyTest ? '/select-purpose' : '/test/hobby')
      }, 1000)
    } catch (error) {
      setLoginStatus('error')
      setLoginMessage(error.response?.data?.message ?? '로그인 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="login-page" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="login-illustration-card">
        <img src={loginCharacter} alt="우리결 캐릭터" className="login-illustration-img" />
      </div>

      <div className="login-right">
        <div className="login-brand">
          <img src={logo} alt="우리결 로고" className="login-brand-logo" />
          <span className="login-brand-name">우리결</span>
        </div>

        <div className="login-form-card">
          <div className="login-inputs">
            <input
              type="text"
              placeholder="아이디"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="login-input"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
          </div>
          <button type="button" className="login-button" onClick={handleLogin}>
            로그인
          </button>
        </div>
        {loginMessage && (
          <p className={`login-message login-message-${loginStatus}`}>{loginMessage}</p>
        )}

        <p className="login-signup-hint">
          처음 오셨나요? <Link to="/signup">회원가입하기</Link>
        </p>
      </div>
    </div>
  )
}
