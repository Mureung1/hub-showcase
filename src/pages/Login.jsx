import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { spacing, styles } from '../styles/theme.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login, signup } = useUser()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // 비밀번호 확인/이메일은 회원가입 와이어프레임에 맞춘 보조 입력이라, 값이 있을 때만 검증한다.
    // (계정 데이터 모델·가입 로직은 기존과 동일하게 아이디/비밀번호만 사용)
    if (mode === 'signup' && passwordConfirm && password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (mode === 'signup' && email && !EMAIL_PATTERN.test(email)) {
      setError('이메일 형식이 올바르지 않습니다.')
      return
    }

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
    setPasswordConfirm('')
    setEmail('')
  }

  return (
    <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <ScreenHeader title="CJMT" subtitle="오늘의 영양 균형을 확인해보세요" />

      <Card>
        <form onSubmit={handleSubmit}>
          <TextField label="아이디" id="login-id" value={id} onChange={(e) => setId(e.target.value)} required />
          <TextField
            label="비밀번호"
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {mode === 'signup' && (
            <>
              <TextField
                label="비밀번호 확인"
                id="login-password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              <TextField
                label="이메일"
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </>
          )}

          {error && <p style={styles.errorText}>{error}</p>}

          <AppButton type="submit" style={{ marginTop: spacing.sm }}>
            {mode === 'login' ? '로그인' : '다음'}
          </AppButton>
        </form>

        <button
          type="button"
          className="tds-press"
          onClick={toggleMode}
          style={{ ...styles.linkButton, display: 'block', margin: `${spacing.lg}px auto 0` }}
        >
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </Card>
    </div>
  )
}
