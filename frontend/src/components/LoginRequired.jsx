import './LoginRequired.css'

const LoginRequired = ({ message, state }) => {
  const loginHref = state ? `/api/auth/google?state=${state}` : '/api/auth/google'

  return (
    <div className="login-required">
      <p>{message}</p>
      <a href={loginHref} className="link-btn">로그인하러 가기</a>
    </div>
  )
}

export default LoginRequired
