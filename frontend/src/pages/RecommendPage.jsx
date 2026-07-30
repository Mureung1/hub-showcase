import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useAppState } from '../state/useAppState'
import Envelope from '../components/Envelope'
import paper from '../styles/letterPaper.module.css'
import styles from './RecommendPage.module.css'

export default function RecommendPage() {
  const { state, actions } = useAppState()
  const [opening, setOpening] = useState(false)
  const unfolded = useRef(false) // onAnimationComplete 중복 호출 방지

  if (!state.opened) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>낯선 이의 편지</h1>
        <div className={styles.envelopeStage}>
          <motion.div
            className={styles.envelopeLayer}
            animate={
              opening
                ? { rotate: [0, -6, 6, -3, 0], opacity: 0, scale: 0.85, y: 8 }
                : { rotate: 0, opacity: 1, scale: 1, y: 0 }
            }
            transition={{ duration: 0.5 }}
          >
            <Envelope
              variant="basic"
              onClick={() => !opening && setOpening(true)}
              width={190}
              height={130}
              label="편지 펼치기"
            />
          </motion.div>

          <motion.div
            className={styles.paperLayer}
            initial={false}
            animate={
              opening
                ? { opacity: 1, y: -18, scale: 1 }
                : { opacity: 0, y: 24, scale: 0.5 }
            }
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              if (opening && !unfolded.current) {
                unfolded.current = true
                actions.unfold()
              }
            }}
          >
            <span className={styles.paperLine} />
            <span className={styles.paperLine} />
            <span className={styles.paperLine} />
          </motion.div>
        </div>
        <p className={styles.hint}>{opening ? '편지를 펼치는 중...' : '봉투를 눌러 펼치기'}</p>
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
    <motion.div
      className={styles.opened}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <article className={paper.paper}>
        <div className={styles.aiBanner}>
          <span className="msymf">auto_awesome</span>
          {recommendation.reason}
        </div>

        <p className={paper.body}>{recommendation.matched_letter.body}</p>

        <footer className={`${paper.footer} ${styles.decisionFooter}`}>
          <button type="button" className={styles.btnPrimary} onClick={actions.startReply}>
            답장 쓰기
          </button>
          <button type="button" className={styles.btnOutline} onClick={actions.passBy}>
            스쳐 가기
          </button>
          <button type="button" className={styles.btnOutline} onClick={actions.refreshRecommendation}>
            다른 편지 보기
          </button>
        </footer>
      </article>
    </motion.div>
  )
}
