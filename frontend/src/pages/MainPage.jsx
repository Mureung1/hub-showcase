import { useAppState } from '../state/useAppState'
import { charCount, dateStr, SERIAL_NO } from '../lib/format'
import styles from './MainPage.module.css'

export default function MainPage() {
  const { state, actions } = useAppState()

  const handleSend = () => {
    if (state.replying) {
      actions.sendReply()
    } else {
      actions.toSend()
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <p className={styles.brand}>Bridge</p>
        <h1 className={styles.title}>오늘의 편지를 씁니다</h1>
        <p className={styles.tagline}>A bridge between souls, one stroke at a time.</p>
      </header>

      {state.replying && (
        <div className={styles.replyBanner}>
          <span className="msym">reply</span>
          답장을 쓰는 중이에요
          <button type="button" className={styles.replyCancel} onClick={actions.cancelReply}>
            그만두기
          </button>
        </div>
      )}

      <article className={styles.letter}>
        <div className={styles.meta}>
          <span className="msym">mail</span>
          <span className={styles.serial}>{SERIAL_NO}</span>
          <span className={styles.metaSep}>·</span>
          <span>{dateStr()}</span>
          <span className={styles.metaSep}>·</span>
          <span>Seoul, South Korea</span>
        </div>

        <input
          className={styles.titleInput}
          type="text"
          placeholder="제목"
          value={state.title}
          onChange={(e) => actions.setTitle(e.target.value)}
        />
        {!state.title && <p className={styles.noTitleHint}>없어도 괜찮아요.</p>}

        <textarea
          className={styles.body}
          placeholder="친애하는 누군가에게…"
          value={state.letter}
          onChange={(e) => actions.setLetter(e.target.value)}
          onPaste={(e) => e.preventDefault()}
        />

        <footer className={styles.footer}>
          <span className={styles.autosave}>
            <span className="msymf">check_circle</span>
            자동 저장됨
          </span>
          <span className={styles.charCount}>{charCount(state.letter)}자 작성 중</span>

          <button type="button" className={styles.sendBtn} onClick={handleSend} aria-label="편지 보내기">
            <span className="msymf">send</span>
          </button>
        </footer>
      </article>

      <footer className={styles.pageFooter}>
        <span className={styles.brand}>Bridge</span>
        <span>© Bridge — The Art of Slow Correspondence</span>
      </footer>
    </div>
  )
}
