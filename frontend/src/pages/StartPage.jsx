import { useEffect, useRef, useState } from 'react'
import { useAppState } from '../state/useAppState'
import { validateEmail, validatePassword } from '../lib/validateAuth'
import styles from './StartPage.module.css'

const WORDMARK = 'BRIDGE'
const DESC = '하루 한 통의 편지를 씁니다. 붙여넣기 없이, 손으로 직접.\n당신의 글은 24시간 뒤 낯선 이의 편지와 이어집니다.'

// 글자를 한 자씩 늘려가며 "쓰이는" 느낌을 내는 타자기 효과. enabled가 false인 동안은 대기하다가
// true가 되는 순간부터 타이핑을 시작한다(워드마크 → 본문 순으로 이어지도록 하기 위함).
function useTypewriter(text, speedMs, enabled = true) {
  const [count, setCount] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!enabled) return undefined
    let i = 0
    const tick = () => {
      i += 1
      setCount(i)
      if (i < text.length) {
        timerRef.current = setTimeout(tick, speedMs)
      }
    }
    timerRef.current = setTimeout(tick, speedMs)
    return () => clearTimeout(timerRef.current)
  }, [text, speedMs, enabled])

  return { text: text.slice(0, count), done: count >= text.length }
}

export default function StartPage() {
  const { actions } = useAppState()
  const wordmark = useTypewriter(WORDMARK, 90)
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

    // Supabase 호출 전에 형식부터 검사해 네트워크 왕복 없이 바로 피드백을 준다
    if (!validateEmail(email)) {
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }
    if (!validatePassword(password)) {
      setError('비밀번호는 6자 이상이어야 해요.')
      return
    }

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

        <h1 className={styles.wordmark}>
          {wordmark.text}
          {!wordmark.done && <span className={styles.caret} aria-hidden="true" />}
        </h1>
        <div className={styles.divider} />

        <p className={styles.desc}>{DESC}</p>

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
