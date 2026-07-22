import './LoginRequired.css'

const LoginRequired = ({ message }) => (
  <div className="login-required">
    <p>{message}</p>
    <a href="/api/auth/google" className="link-btn">로그인하러 가기</a>
  </div>
)

export default LoginRequired
