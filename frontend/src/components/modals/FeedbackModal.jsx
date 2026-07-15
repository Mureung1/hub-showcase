import { useAppState } from '../../state/useAppState'
import styles from './modal.module.css'

const REASONS = ['주제가 안 맞았어요', '이미 아는 이야기', '마음이 가지 않았어요']

export default function FeedbackModal() {
  const { state, actions } = useAppState()

  return (
    <div className={styles.backdrop}>
      <div className={styles.card}>
        <div className={`${styles.iconCircle} ${styles.iconCircleTeal}`}>
          <span className="msym">tune</span>
        </div>
        <h2 className={styles.title}>잠깐, 짧은 의견을 들려주세요</h2>
        <p className={styles.desc}>다음 추천 품질을 개선하는 데 쓰일게요.</p>

        <div className={styles.chips}>
          {REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className={`${styles.chip} ${state.feedback === reason ? styles.chipActive : ''}`}
              onClick={() => actions.setFeedback(reason)}
            >
              {reason}
            </button>
          ))}
        </div>

        <textarea
          className={styles.textarea}
          placeholder="더 하고 싶은 말이 있다면 적어주세요 (선택)"
          value={state.feedback && !REASONS.includes(state.feedback) ? state.feedback : ''}
          onChange={(e) => actions.setFeedback(e.target.value)}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.btnOutline} onClick={actions.closeFeedback}>
            건너뛰기
          </button>
          <button type="button" className={styles.btnPrimary} onClick={actions.sendFeedback}>
            보내기
          </button>
        </div>
      </div>
    </div>
  )
}
