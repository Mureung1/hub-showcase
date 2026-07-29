import { useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Spinner from './Spinner.jsx'
import { sendChatMessage } from '../lib/chatBot.js'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

// FR-6 — Meal-Bot. 대화 이력은 이 컴포넌트의 state에만 있고(서버에 영구 저장 안 함), 새로고침하면
// 사라진다 — 스스로 트리거 버튼과 시트를 함께 관리해(WaterIntakeCard/BarcodeScanButton과 같은
// self-contained 패턴) 홈 화면(Analyze.jsx)에는 <ChatBotSheet/> 한 줄만 놓으면 된다.
export default function ChatBotSheet() {
  const { effectiveRecommended, todayMealsTotal } = useUser()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useFocusTrap(open, sending ? undefined : () => setOpen(false))
  const listRef = useRef(null)

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setError('')
    setInput('')
    const nextMessages = [...messages, { role: 'user', text }]
    setMessages(nextMessages)
    setSending(true)
    try {
      const reply = await sendChatMessage({
        message: text,
        history: messages,
        dailyContext: { recommended: effectiveRecommended, todayTotal: todayMealsTotal },
      })
      setMessages([...nextMessages, { role: 'bot', text: reply }])
    } catch (err) {
      setError(err.message || '답변을 받지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSending(false)
      requestAnimationFrame(() => {
        // 일부 환경(jsdom 등)엔 scrollTo가 아예 없다 — 없으면 조용히 건너뛴다(스크롤은 부가 동작).
        if (typeof listRef.current?.scrollTo === 'function') {
          listRef.current.scrollTo({ top: listRef.current.scrollHeight })
        }
      })
    }
  }

  return (
    <>
      <button
        type="button"
        className="tds-press"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: spacing.lg,
          // 탭바 높이를 담은 별도 토큰이 없어 실측 근사치(64px)를 직접 더한다 — 탭바 스타일이
          // 바뀌면 이 값도 같이 확인해야 한다.
          bottom: `calc(64px + ${spacing.lg}px + env(safe-area-inset-bottom))`,
          width: 52,
          height: 52,
          borderRadius: radius.pill,
          border: 'none',
          background: colors.primary,
          color: '#fff',
          fontSize: font.size.lg,
          boxShadow: shadow.card,
          cursor: 'pointer',
          zIndex: 50,
        }}
        aria-label="영양 상담 챗봇 열기"
      >
        💬
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chatbot-sheet-title"
          ref={containerRef}
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(25, 31, 40, 0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: layout.pagePaddingX,
          }}
          onClick={() => !sending && setOpen(false)}
        >
          <div
            className="tds-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: layout.maxWidth,
              height: '70vh',
              display: 'flex',
              flexDirection: 'column',
              background: colors.surface,
              borderRadius: radius.lg,
              boxShadow: shadow.card,
              padding: spacing.lg,
              marginBottom: `calc(${spacing.lg}px + env(safe-area-inset-bottom))`,
              boxSizing: 'border-box',
            }}
          >
            <h3 id="chatbot-sheet-title" style={{ margin: `0 0 ${spacing.sm}px`, fontSize: font.size.lg, color: colors.textStrong }}>
              영양 상담
            </h3>

            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', margin: `0 0 ${spacing.md}px` }}>
              {messages.length === 0 && (
                <p style={{ color: colors.textSub, fontSize: font.size.sm }}>
                  오늘 드신 음식을 참고해서 답해드려요. 궁금한 걸 편하게 물어보세요.
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    margin: `0 0 ${spacing.sm}px`,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: '85%',
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      borderRadius: radius.md,
                      background: msg.role === 'user' ? colors.primary : colors.bg,
                      color: msg.role === 'user' ? '#fff' : colors.textStrong,
                      fontSize: font.size.sm,
                      textAlign: 'left',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.text}
                  </span>
                </div>
              ))}
              {sending && <Spinner size={16} />}
            </div>

            {error && <p style={{ color: colors.dangerText, fontSize: font.size.sm, margin: `0 0 ${spacing.sm}px` }}>{error}</p>}

            <div style={{ display: 'flex', gap: spacing.sm }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="예: 오늘 저녁 뭐 먹을까요?"
                disabled={sending}
                style={{
                  flex: 1,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radius.pill,
                  border: `1px solid ${colors.border}`,
                  fontSize: font.size.sm,
                }}
              />
              <button
                type="button"
                className="tds-press"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                style={{
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                  borderRadius: radius.pill,
                  border: 'none',
                  background: colors.primary,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: font.size.sm,
                  cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !input.trim() ? 0.5 : 1,
                }}
              >
                보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
