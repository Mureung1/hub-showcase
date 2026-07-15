import { useEffect, useState } from 'react'
import './LoginPage.css'
import { clearToken, fetchMe } from '../lib/auth'

const LoginPage = () => {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchMe().then((me) => {
      if (me) {
        setUser(me)
        setStatus('loggedIn')
      } else {
        setStatus('loggedOut')
      }
    })
  }, [])

  const handleLogout = () => {
    clearToken()
    setUser(null)
    setStatus('loggedOut')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">SUBZIP</h1>

        {status === 'loading' && <p className="login-hint">확인 중...</p>}

        {status === 'loggedOut' && (
          <>
            <p className="login-hint">구글 계정으로 로그인하세요</p>
            <a className="btn-primary" href="/api/auth/google">
              구글로 로그인
            </a>
          </>
        )}

        {status === 'loggedIn' && user && (
          <>
            <p className="login-hint">
              {user.username}님 ({user.email})
            </p>
            <button className="btn-outline" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default LoginPage
