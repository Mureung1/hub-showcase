import { API_BASE } from '../lib/apiBase'
import './LoginRequired.css'

const LoginRequired = ({ message, state }) => {
  const loginHref = state
    ? `${API_BASE}/api/auth/google?state=${state}`
    : `${API_BASE}/api/auth/google`

  return (
    <div className="login-required">
      <p>{message}</p>
      <a href={loginHref} className="link-btn">로그인하러 가기</a>
    </div>
  )
}

export default LoginRequired
