import { useAppState } from '../state/useAppState'
import Envelope from '../components/Envelope'
import styles from './RecommendPage.module.css'

export default function RecommendPage() {
  const { state, actions } = useAppState()

  if (!state.opened) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>낯선 이의 편지</h1>
        <Envelope variant="basic" onClick={actions.unfold} width={190} height={130} label="편지 펼치기" />
        <p className={styles.hint}>봉투를 눌러 펼치기</p>
      </div>
    )
  }

  const recommendation = state.recommendation

  if (!recommendation) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>불러오는 중이에요</h1>
        <p className={styles.hint}>잠시 후 다시 확인해주세요.</p>
      </div>
    )
  }

  // 이 편지 자체의 감정 분석이 아직 안 끝났거나 실패한 경우 — 후보를 찾을 수조차 없는 상태
  if (recommendation.reason_code === 'tagging_pending') {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>편지를 아직 분석 중이에요</h1>
        <p className={styles.hint}>잠시 후 다시 확인해주세요.</p>
        <button type="button" className={styles.btnOutline} onClick={actions.goMain}>
          돌아가기
        </button>
      </div>
    )
  }

  // 아직 연결할 편지를 못 찾았거나(no_candidates), 편지를 찾지 못한 경우(not_found),
  // 위기 신호가 감지된 경우(support_needed — 작성자에게는 일반적인 "아직 못 찾음"과 동일하게
  // 보여준다. 위기 신호는 관리자만 서버 로그로 확인하고, 작성자 화면에는 티 내지 않는다.)
  if (!recommendation.has_match) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>아직 연결할 편지를 찾지 못했어요</h1>
        <p className={styles.hint}>조금 뒤에 다시 확인해주세요.</p>
        <button type="button" className={styles.btnOutline} onClick={actions.goMain}>
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className={styles.opened}>
      <div className={styles.left}>
        <div className={styles.aiBanner}>
          <span className="msymf">auto_awesome</span>
          {recommendation.reason}
        </div>

        <article className={styles.letter}>
          <p className={styles.letterBody}>{recommendation.matched_letter.body}</p>
        </article>
      </div>

      <aside className={styles.right}>
        <h3 className={styles.replyPrompt}>이 편지에, 어떻게 답할까요?</h3>
        <button type="button" className={styles.btnPrimary} onClick={actions.startReply}>
          답장 쓰기
        </button>
        <button type="button" className={styles.btnOutline} onClick={actions.passBy}>
          스쳐 가기
        </button>
        <button type="button" className={styles.btnOutline} onClick={actions.refreshRecommendation}>
          다른 편지 보기
        </button>
      </aside>
    </div>
  )
}
