import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'

export default function Login() {
  const { login, signup } = useUser()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const user = mode === 'login' ? login(id, password) : signup(id, password)
      navigate(user.profile ? '/analyze' : '/profile', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
    setError('')
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <h1>{mode === 'login' ? '로그인' : '회원가입'}</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="login-id">아이디</label>
          <input
            id="login-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
            style={{ width: '100%', display: 'block' }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="login-password">비밀번호</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', display: 'block' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%' }}>
          {mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
      <button
        type="button"
        onClick={toggleMode}
        style={{ marginTop: 12, background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer' }}
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
