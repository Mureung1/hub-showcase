import { useState } from 'react'
import { useAppState } from '../state/useAppState'
import styles from './StartPage.module.css'

export default function StartPage() {
  const { actions } = useAppState()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
    setError('')
    setInfo('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    const result = mode === 'login' ? await actions.signIn(email, password) : await actions.signUp(email, password)

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }
    if (result.needsEmailConfirm) {
      setInfo('가입 확인 메일을 보냈어요. 메일함을 확인한 뒤 로그인해주세요.')
      setMode('login')
    }
  }

  return (
    <div className={styles.wrap}>
      <article className={styles.card}>
        <span className={styles.badge}>
          <span className="msym">auto_stories</span>
        </span>

        <h1 className={styles.wordmark}>BRIDGE</h1>
        <div className={styles.divider} />

        <p className={styles.quote}>글이 만나 사람을 이어주는 곳</p>
        <p className={styles.desc}>
          하루 한 통의 편지를 씁니다. 붙여넣기 없이, 손으로 직접.
          <br />
          당신의 글은 24시간 뒤 낯선 이의 편지와 이어집니다.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />

          {error && <p className={styles.formError}>{error}</p>}
          {info && <p className={styles.formInfo}>{info}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </div>
        </form>

        <button type="button" className={styles.switchMode} onClick={switchMode}>
          {mode === 'login' ? '계정이 없나요? 회원가입' : '이미 계정이 있나요? 로그인'}
        </button>

        <p className={styles.caption}>Est. 2024 · Crafted for focus</p>
      </article>

      <p className={styles.footnote}>slow correspondence…</p>
    </div>
  )
}
