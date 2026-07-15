import { useAppState } from '../../state/useAppState'
import styles from './modal.module.css'

export default function ArrivedModal() {
  const { actions } = useAppState()

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={`${styles.iconCircle} ${styles.iconCircleTeal}`}>
          <span className="msymf">mark_email_read</span>
        </div>
        <h2 className={styles.title}>모음소에 잘 도착했어요</h2>
        <p className={styles.desc}>24시간 뒤, AI가 고른 편지가 도착해요.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.btnPrimary} onClick={actions.closeArrived}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
