import { useRef, useState } from 'react'
import { useUser } from '../context/UserContext.jsx'
import Spinner from './Spinner.jsx'
import { sendChatMessage } from '../lib/chatBot.js'
import { useFocusTrap } from '../lib/useFocusTrap.js'
import { colors, font, layout, radius, shadow, spacing } from '../styles/theme.js'

function formatMessageTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// FR-6 — Meal-Bot. 대화 이력은 이 컴포넌트의 state에만 있고(서버에 영구 저장 안 함), 새로고침하면
// 사라진다 — 스스로 트리거 버튼과 시트를 함께 관리해(WaterIntakeCard/BarcodeScanButton과 같은
// self-contained 패턴) AppShell.jsx가 <ChatBotSheet/> 한 줄만 놓으면 된다(리텐션 강화 v4 — 예전엔
// 홈 화면(Analyze.jsx)에만 있었지만, MY 탭을 제외한 4개 탭 어디서나 뜨도록 AppShell로 옮겨졌다).
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
    const nextMessages = [...messages, { role: 'user', text, timestamp: Date.now() }]
    setMessages(nextMessages)
    setSending(true)
    try {
      const reply = await sendChatMessage({
        message: text,
        history: messages,
        dailyContext: { recommended: effectiveRecommended, todayTotal: todayMealsTotal },
      })
      setMessages([...nextMessages, { role: 'bot', text: reply, timestamp: Date.now() }])
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
      {/* 리텐션 강화 v4 — 존재감 강화: 단색 원형 버튼에 은은한 펄스 링(colors.primary 하나만 사용,
          theme.js가 명시한 "포인트 컬러는 그린 1개만" 원칙 준수)과 "AI" 배지를 더해 봇 느낌을 낸다.
          aria-label은 그대로 둬 접근성 트리·기존 테스트의 버튼 이름 조회에 영향이 없다. */}
      <div
        style={{
          position: 'fixed',
          right: spacing.lg,
          bottom: `calc(64px + ${spacing.lg}px + env(safe-area-inset-bottom))`,
          width: 52,
          height: 52,
          zIndex: 50,
        }}
      >
        <span aria-hidden="true" className="tds-chatbot-pulse" style={{ position: 'absolute', inset: 0, borderRadius: radius.pill, background: colors.primary }} />
        <button
          type="button"
          className="tds-press"
          onClick={() => setOpen(true)}
          style={{
            position: 'relative',
            width: 52,
            height: 52,
            borderRadius: radius.pill,
            border: 'none',
            background: colors.primary,
            color: '#fff',
            fontSize: font.size.lg,
            boxShadow: shadow.card,
            cursor: 'pointer',
          }}
          aria-label="영양 상담 챗봇 열기"
        >
          🤖
        </button>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: '#fff',
            color: colors.primary,
            border: `1.5px solid ${colors.primary}`,
            fontSize: 9,
            fontWeight: 800,
            padding: '1px 5px',
            borderRadius: radius.pill,
          }}
        >
          AI
        </span>
      </div>

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
              {/* 실제 DM처럼 아바타+이름표+시간을 함께 보여준다(리텐션 강화 v4) — 유저는
                  flexDirection을 뒤집어 오른쪽에 붙인다. */}
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: spacing.xs,
                      margin: `0 0 ${spacing.sm}px`,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 36 }}>
                      <div
                        aria-hidden="true"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          background: isUser ? colors.bg : colors.primarySurface,
                        }}
                      >
                        {isUser ? '🙂' : '🤖'}
                      </div>
                      <span style={{ fontSize: 9, color: colors.textSub, marginTop: 2 }}>{isUser ? '나' : 'Meal-Bot'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: `${spacing.sm}px ${spacing.md}px`,
                          borderRadius: radius.md,
                          background: isUser ? colors.primary : colors.bg,
                          color: isUser ? '#fff' : colors.textStrong,
                          fontSize: font.size.sm,
                          textAlign: 'left',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {msg.text}
                      </span>
                      <span style={{ fontSize: 9, color: colors.textSub, marginTop: 2 }}>{formatMessageTime(msg.timestamp)}</span>
                    </div>
                  </div>
                )
              })}
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
