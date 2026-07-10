import { useAppState } from '../state/useAppState'
import { RECOMMEND_LETTER } from '../data/mock'
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

  return (
    <div className={styles.opened}>
      <div className={styles.left}>
        <div className={styles.aiBanner}>
          <span className="msymf">auto_awesome</span>
          AI는 두 편지 모두 &lsquo;{RECOMMEND_LETTER.topic}&rsquo;라는 주제를 담고 있다고 판단했습니다.
        </div>

        <article className={styles.letter}>
          <div className={styles.meta}>
            <span>From {RECOMMEND_LETTER.from}</span>
            <span className={styles.metaSep}>·</span>
            <span className={styles.serial}>{RECOMMEND_LETTER.serialNo}</span>
          </div>
          <h2 className={styles.letterTitle}>{RECOMMEND_LETTER.title}</h2>
          <p className={styles.letterBody}>{RECOMMEND_LETTER.body}</p>
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
      </aside>
    </div>
  )
}
