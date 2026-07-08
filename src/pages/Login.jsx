import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { colors, font, spacing, styles } from '../styles/theme.js'

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
    <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h1 style={{ fontSize: font.size.xxl, textAlign: 'center', color: colors.title }}>
        {mode === 'login' ? '로그인' : '회원가입'}
      </h1>
      <p style={{ textAlign: 'center', color: colors.muted, fontSize: font.size.sm, marginBottom: spacing.xl }}>
        CJMT와 함께 오늘의 영양 균형을 확인해보세요
      </p>
      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label htmlFor="login-id" style={styles.label}>
              아이디
            </label>
            <input id="login-id" value={id} onChange={(e) => setId(e.target.value)} required style={styles.input} />
          </div>
          <div style={styles.field}>
            <label htmlFor="login-password" style={styles.label}>
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          {error && <p style={styles.errorText}>{error}</p>}
          <button type="submit" className="tds-press" style={{ ...styles.buttonPrimary, marginTop: spacing.sm }}>
            {mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
        <button
          type="button"
          className="tds-press"
          onClick={toggleMode}
          style={{ ...styles.linkButton, display: 'block', margin: `${spacing.lg}px auto 0` }}
        >
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </div>
    </div>
  )
}
