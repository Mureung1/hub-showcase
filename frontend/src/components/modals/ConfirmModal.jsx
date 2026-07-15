import { useAppState } from '../../state/useAppState'
import styles from './modal.module.css'

export default function ConfirmModal() {
  const { actions } = useAppState()

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={`${styles.iconCircle} ${styles.iconCircleRust}`}>
          <span className="msymf">lock</span>
        </div>
        <h2 className={styles.title}>정말 보낼까요?</h2>
        <p className={styles.desc}>편지는 한 번 보내면 수정할 수 없어요.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.btnOutline} onClick={actions.cancelConfirm}>
            취소
          </button>
          <button type="button" className={styles.btnPrimary} onClick={actions.reallySend}>
            보내기
          </button>
        </div>
      </div>
    </div>
  )
}
