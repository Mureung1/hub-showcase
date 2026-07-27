import { useAppState } from '../state/useAppState'
import { fmt } from '../lib/format'
import Envelope from '../components/Envelope'
import styles from './SentPage.module.css'

export default function SentPage() {
  const { state, actions } = useAppState()

  if (state.phase === 'arrived') {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>추천 편지가 도착했어요</h1>
        <Envelope
          variant="basic"
          pulsing
          onClick={actions.openRecommend}
          width={160}
          height={110}
          label="추천 편지 열어보기"
        />
        <span className={styles.badge}>새 편지 도착 · AI 추천</span>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>편지가 모음소에 잘 도착했어요</h1>
      <Envelope variant="basic" floating width={160} height={110} label="발송한 편지" />
      <p className={styles.promptLabel}>Next letter prompt</p>
      <p className={styles.countdown}>{fmt(state.waitSecs)}</p>
      <button type="button" className={styles.fastForward} onClick={actions.checkRecommendationNow}>
        지금 도착했는지 확인 (데모)
      </button>
    </div>
  )
}
