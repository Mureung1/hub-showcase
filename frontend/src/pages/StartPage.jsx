import { useAppState } from '../state/useAppState'
import styles from './StartPage.module.css'

export default function StartPage() {
  const { actions } = useAppState()

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

        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={actions.login}>
            로그인
          </button>
          <button type="button" className={styles.btnOutline} onClick={actions.login}>
            회원가입
          </button>
        </div>

        <p className={styles.caption}>Est. 2024 · Crafted for focus</p>
      </article>

      <p className={styles.footnote}>slow correspondence…</p>
    </div>
  )
}
