import { useState } from 'react'
import { useAppState } from '../state/useAppState'
import { validatePassword } from '../lib/validateAuth'
import styles from './StartPage.module.css'

export default function ResetPasswordPage() {
  const { actions } = useAppState()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validatePassword(password)) {
      setError('비밀번호는 6자 이상이어야 해요.')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 서로 달라요.')
      return
    }

    setSubmitting(true)
    const result = await actions.updatePassword(password)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    }
  }

  return (
    <div className={styles.wrap}>
      <article className={styles.card}>
        <span className={styles.badge}>
          <span className="msym">lock_reset</span>
        </span>

        <h1 className={styles.wordmark}>BRIDGE</h1>
        <div className={styles.divider} />

        <p className={styles.desc}>새 비밀번호를 설정해주세요.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="password"
            placeholder="새 비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              비밀번호 저장
            </button>
          </div>
        </form>

        <p className={styles.caption}>Est. 2024 · Crafted for focus</p>
      </article>
    </div>
  )
}
