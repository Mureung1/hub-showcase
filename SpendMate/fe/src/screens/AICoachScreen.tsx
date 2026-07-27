import { useState, useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { Send, Sparkles, TrendingDown, ChefHat, BarChart3, X, Clock, Users, ChevronRight } from 'lucide-react'
import { sendAgentMessage } from '../lib/api'

export type Message = {
  id: number
  role: 'ai' | 'user'
  text: string
  card?: 'recipe' | 'compare' | 'tip'
}

const QUICK_REPLIES = ['이번 달 얼마 썼어?', '예산 얼마 남았어?', '구독 뭐 있지?']

export const INITIAL_COACH_MESSAGES: Message[] = [
  { id: 1, role: 'ai', text: '안녕하세요! 저는 SpendMate AI 코치예요. 지출, 예산, 구독에 대해 뭐든 물어보세요! 💬' },
]

const RECIPES = [
  {
    emoji: '🍳',
    name: '계란볶음밥',
    cost: '약 1,200원',
    time: '10분',
    servings: '1인분',
    ingredients: ['밥 1공기', '계란 2개', '대파 1/4대', '간장 1큰술', '참기름 1/2작은술', '식용유', '소금·후추'],
    steps: ['달군 팬에 식용유를 두르고 중불로 가열해요', '계란을 풀어 스크램블 에그를 만들어요', '밥을 넣고 계란과 잘 섞어주세요', '간장과 소금으로 간을 맞춰요', '대파를 넣고 30초 더 볶아요', '불을 끄고 참기름을 둘러 완성해요'],
    saving: 17300,
  },
  {
    emoji: '🥗',
    name: '참치샐러드',
    cost: '약 800원',
    time: '5분',
    servings: '1인분',
    ingredients: ['참치캔 1개', '양상추', '방울토마토 5개', '마요네즈 1큰술', '레몬즙', '소금·후추'],
    steps: ['참치캔을 따서 기름을 제거해요', '양상추를 한입 크기로 찢어요', '방울토마토를 반으로 잘라요', '모든 재료를 볼에 담아요', '마요네즈, 레몬즙, 소금으로 버무려요'],
    saving: 17700,
  },
  {
    emoji: '🍜',
    name: '라면+계란',
    cost: '약 500원',
    time: '5분',
    servings: '1인분',
    ingredients: ['라면 1봉지', '계란 1개', '대파 약간', '물 550ml'],
    steps: ['물 550ml를 끓여요', '면과 수프를 넣어요', '계란을 풀어 넣어요', '대파를 송송 썰어 올려요', '2분 더 끓여 완성해요'],
    saving: 18000,
  },
]

/* ── 레시피 상세 모달 ── */
function RecipeDetailModal({ onClose }: { onClose: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const recipe = RECIPES[activeIdx]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: 393, maxHeight: '90%',
        background: 'var(--background)', borderRadius: '28px 28px 0 0',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>절약 레시피</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>배달비 대신 집밥으로 절약해요</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 99, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="var(--muted)" />
          </button>
        </div>

        {/* Recipe Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px', overflowX: 'auto', flexShrink: 0 }} className="no-scrollbar">
          {RECIPES.map((r, i) => (
            <button
              key={r.name}
              onClick={() => setActiveIdx(i)}
              style={{
                whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 99,
                border: `2px solid ${activeIdx === i ? '#6ED6C8' : 'var(--border)'}`,
                background: activeIdx === i ? '#E8F8F6' : 'white',
                color: activeIdx === i ? '#3DBD9E' : 'var(--muted)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard',
              }}
            >
              {r.emoji} {r.name}
            </button>
          ))}
        </div>

        {/* Recipe Detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 32px' }} className="no-scrollbar">
          {/* Hero */}
          <div style={{ borderRadius: 20, background: 'linear-gradient(135deg, #E8F8F6, #EBF2FF)', padding: '24px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>{recipe.emoji}</div>
            <h3 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: 'var(--foreground)' }}>{recipe.name}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>배달 대신 이걸로 절약!</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 2 }}>
                  <Clock size={14} color="#6ED6C8" />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>조리시간</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>{recipe.time}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 2 }}>
                  <Users size={14} color="#4F8EF7" />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>분량</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>{recipe.servings}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>재료비</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#3DBD9E' }}>{recipe.cost}</span>
              </div>
            </div>
          </div>

          {/* Saving badge */}
          <div style={{ background: '#FFF8E8', border: '1px solid #FFE4A0', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>🎉 배달 대비 절약 금액</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#D97706' }}>+{recipe.saving.toLocaleString()}원</span>
          </div>

          {/* Ingredients */}
          <div style={{ background: 'white', borderRadius: 20, padding: '18px', marginBottom: 14, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>🛒 재료</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {recipe.ingredients.map((ing, i) => (
                <span key={i} style={{ padding: '6px 12px', background: '#F3F4F6', borderRadius: 99, fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>{ing}</span>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div style={{ background: 'white', borderRadius: 20, padding: '18px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>👩‍🍳 조리법</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recipe.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 99, background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#4F8EF7' }}>{i + 1}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--foreground)', lineHeight: 1.6, fontWeight: 500 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Recipe Card (채팅용) ── */
function RecipeCard({ onViewAll }: { onViewAll: () => void }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginTop: 8, border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#E8F8F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChefHat size={16} color="#6ED6C8" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--foreground)' }}>오늘의 절약 레시피</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>배달비 18,500원 → 재료비 6,200원</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {RECIPES.map((r) => (
          <div
            key={r.name}
            onClick={onViewAll}
            style={{ flex: 1, background: 'var(--background)', borderRadius: 10, padding: '8px 6px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--foreground)', cursor: 'pointer' }}
          >
            {r.emoji} {r.name}
          </div>
        ))}
      </div>
      <button
        onClick={onViewAll}
        style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 12, background: '#E8F8F6', border: 'none', color: '#3DBD9E', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        전체 레시피 보기 <ChevronRight size={14} />
      </button>
    </div>
  )
}

function CompareCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', marginTop: 8, border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart3 size={16} color="#4F8EF7" />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--foreground)' }}>편의점 가격 비교</p>
      </div>
      {[
        { name: 'CU', price: '5,400원', diff: '-700원', best: true },
        { name: 'GS25', price: '6,100원', diff: '기준', best: false },
        { name: '세븐일레븐', price: '5,800원', diff: '-300원', best: false },
      ].map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
          <span style={{ fontSize: 14, fontWeight: s.best ? 700 : 500, color: s.best ? '#4F8EF7' : 'var(--foreground)' }}>{s.best && '⭐ '}{s.name}</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{s.price}</span>
            <span style={{ fontSize: 11, marginLeft: 6, color: s.diff.startsWith('-') ? '#6ED6C8' : 'var(--muted)' }}>{s.diff}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function TipCard() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #FFF8E8, #FFF3E8)', borderRadius: 16, padding: '14px 16px', marginTop: 8, border: '1px solid #FFE4A0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FFF3CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingDown size={16} color="#FFC857" />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#B45309' }}>이번 달 절약 미션</p>
      </div>
      {['☕ 카페 2회→1회로 줄이기 (절약 +6,500원)', '🛵 배달 주 3회→1회 (절약 +37,000원)', '🛒 이마트 대신 노브랜드 이용'].map((t, i) => (
        <div key={i} style={{ fontSize: 13, color: '#92400E', padding: '5px 0', borderBottom: i < 2 ? '1px solid rgba(180,83,9,0.1)' : 'none', lineHeight: 1.4 }}>{t}</div>
      ))}
    </div>
  )
}

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
  const [showRecipeDetail, setShowRecipeDetail] = useState(false)
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
    <>
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
                    {msg.card === 'recipe' && <RecipeCard onViewAll={() => setShowRecipeDetail(true)} />}
                    {msg.card === 'compare' && <CompareCard />}
                    {msg.card === 'tip' && <TipCard />}
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

      {showRecipeDetail && <RecipeDetailModal onClose={() => setShowRecipeDetail(false)} />}
    </>
  )
}
