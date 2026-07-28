import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { sendAgentMessage } from '../lib/api'

export type Message = {
  id: number
  role: 'ai' | 'user'
  text: string
}

const QUICK_REPLIES = ['이번 달 얼마 썼어?', '예산 얼마 남았어?', '구독 뭐 있지?']

export const INITIAL_COACH_MESSAGES: Message[] = [
  { id: 1, role: 'ai', text: '안녕하세요! 저는 SpendMate AI 코치예요. 지출, 예산, 구독에 대해 뭐든 물어보세요! 💬' },
]

/* Claude 응답의 "**굵게**" 표시를 실제 굵은 글씨로 렌더링 (마크다운 라이브러리 없이 최소 처리) */
function renderWithBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return <strong key={i}>{chunk.slice(2, -2)}</strong>
    }
    return <span key={i}>{chunk}</span>
  })
}

type AICoachScreenProps = {
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
}

export default function AICoachScreen({ messages, setMessages }: AICoachScreenProps) {
  const [input, setInput] = useState('')
  const [showTyping, setShowTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showTyping])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now(), role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setShowTyping(true)

    try {
      const response = await sendAgentMessage(text)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: response.message }])
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'AI 코치와 연결하지 못했어요. 잠시 후 다시 시도해주세요.' }])
    } finally {
      setShowTyping(false)
    }
  }

  return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
        {/* Header */}
        <div style={{ padding: '8px 20px 14px', background: 'white', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #6ED6C8, #4F8EF7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>AI 소비 코치</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6ED6C8', fontWeight: 600 }}>● 온라인</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }} className="no-scrollbar">
          {messages.map(msg => (
            <div key={msg.id} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'ai' && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '85%' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #6ED6C8, #4F8EF7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={13} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: 'white', borderRadius: '4px 16px 16px 16px', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
                      <p style={{ margin: 0, fontSize: 14, color: 'var(--foreground)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{renderWithBold(msg.text)}</p>
                    </div>
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div style={{ background: 'linear-gradient(135deg, #4F8EF7, #6B5CF0)', borderRadius: '16px 4px 16px 16px', padding: '12px 14px', maxWidth: '75%' }}>
                  <p style={{ margin: 0, fontSize: 14, color: 'white', lineHeight: 1.6 }}>{msg.text}</p>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {showTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #6ED6C8, #4F8EF7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={13} color="white" />
              </div>
              <div style={{ background: 'white', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick Replies */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          {QUICK_REPLIES.map(q => (
            <button key={q} onClick={() => sendMessage(q)} style={{ whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 99, background: 'white', border: '1.5px solid var(--border)', color: 'var(--foreground)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}>
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '8px 16px 16px', background: 'white', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--background)', borderRadius: 16, padding: '6px 6px 6px 16px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="AI 코치에게 물어보세요..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--foreground)', fontFamily: 'Pretendard', minHeight: 36 }}
            />
            <button onClick={() => sendMessage(input)} style={{ width: 38, height: 38, borderRadius: 12, background: input ? '#4F8EF7' : '#E5E7EB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
              <Send size={16} color={input ? 'white' : '#9CA3AF'} />
            </button>
          </div>
        </div>
      </div>
  )
}
