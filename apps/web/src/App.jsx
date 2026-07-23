/* ═══════════════════════════════════════════════════════════════════════════
   App.jsx — 자취방 청결관리사
   DESIGN_SYSTEM.md 기반 UI
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react'
import { startSession, turn, done, fetchSpaces } from './api.js'
import './design/global.css'

// ═══════════════════════════════════════════════════════════════════════════
// confidence 라벨 매핑
// ═══════════════════════════════════════════════════════════════════════════
const CONFIDENCE = {
  most_likely: { label: '유력', color: 'var(--color-mint)' },
  possible: { label: '가능', color: 'var(--color-amber)' },
  unlikely: { label: '낮음', color: 'var(--color-ink-muted)' },
}

// ═══════════════════════════════════════════════════════════════════════════
// Eyebrow — 화면 상단 분류 표시
// ═══════════════════════════════════════════════════════════════════════════
function Eyebrow({ children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      marginBottom: 'var(--space-4)',
    }}>
      <span style={{
        width: 16,
        height: 2,
        background: 'var(--color-mint)',
        borderRadius: 1,
      }} />
      <span style={{
        font: 'var(--font-eyebrow)',
        color: 'var(--color-mint)',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
      }}>
        {children}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ActionButton — 기본 버튼
// ═══════════════════════════════════════════════════════════════════════════
function ActionButton({ children, variant = 'primary', onClick, disabled, style }) {
  const variants = {
    primary: {
      background: 'var(--color-mint)',
      color: 'white',
      hoverBg: 'var(--color-mint-deep)',
    },
    secondary: {
      background: 'var(--color-tile)',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-border)',
      hoverBg: 'var(--color-tile-hover)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-ink-soft)',
      hoverBg: 'var(--color-mint-wash)',
    },
  }

  const v = variants[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 'var(--space-3) var(--space-5)',
        borderRadius: 'var(--radius-btn)',
        font: 'var(--font-caption)',
        background: v.background,
        color: v.color,
        border: v.border || 'none',
        transition: 'background var(--transition-fast)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// QuestionCard — 질문 카드
// ═══════════════════════════════════════════════════════════════════════════
function QuestionCard({ question, options, onSelect, disabled }) {
  return (
    <div style={{
      background: 'var(--color-tile)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-6)',
      boxShadow: 'var(--shadow-card)',
      maxWidth: 'var(--width-card)',
    }}>
      <p style={{
        font: 'var(--font-title)',
        color: 'var(--color-ink)',
        marginBottom: 'var(--space-5)',
      }}>
        {question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt)}
            disabled={disabled}
            style={{
              padding: 'var(--space-4)',
              textAlign: 'left',
              background: 'var(--color-paper)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-light)',
              font: 'var(--font-body)',
              color: 'var(--color-ink)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HypothesisCard — 가설 카드
// ═══════════════════════════════════════════════════════════════════════════
function HypothesisCard({ hypothesis, rank }) {
  const conf = CONFIDENCE[hypothesis.confidence] || CONFIDENCE.unlikely

  return (
    <div style={{
      background: 'var(--color-tile)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* 상단: 순위 + 신뢰도 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-3)',
      }}>
        <span style={{
          font: 'var(--font-caption)',
          color: conf.color,
        }}>
          가설 {rank} · {conf.label}
        </span>

        {/* 신뢰도 바 */}
        <div style={{
          display: 'flex',
          gap: 2,
        }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 4,
                borderRadius: 2,
                background: i <= (hypothesis.confidence === 'most_likely' ? 3 : hypothesis.confidence === 'possible' ? 2 : 1)
                  ? conf.color
                  : 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </div>

      {/* 원인명 */}
      <h3 style={{
        font: 'var(--font-title)',
        color: 'var(--color-ink)',
        marginBottom: 'var(--space-2)',
      }}>
        {hypothesis.cause}
      </h3>

      {/* 해결책 */}
      <p style={{
        font: 'var(--font-body)',
        color: 'var(--color-ink-soft)',
      }}>
        {hypothesis.evidence}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// AssumeBox — 가정 경고 박스 (점선 테두리)
// ═══════════════════════════════════════════════════════════════════════════
function AssumeBox({ reason }) {
  return (
    <div style={{
      background: 'var(--color-amber-wash)',
      border: '2px dashed var(--color-amber)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      marginBottom: 'var(--space-5)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)',
      }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span style={{
          font: 'var(--font-caption)',
          color: 'var(--color-amber-deep)',
        }}>
          가정하고 진행
        </span>
      </div>
      <p style={{
        font: 'var(--font-body)',
        color: 'var(--color-ink-soft)',
      }}>
        {reason || '확정하지 못했지만 가장 유력한 원인을 추정했어요'}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HistoryItem — 히스토리 항목
// ═══════════════════════════════════════════════════════════════════════════
function HistoryItem({ question, answer }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: 'var(--color-tile)',
      borderRadius: 'var(--radius-sm)',
      borderLeft: '3px solid var(--color-mint)',
    }}>
      <span style={{ color: 'var(--color-mint)' }}>✓</span>
      <div>
        <p style={{ font: 'var(--font-body)', color: 'var(--color-ink-soft)' }}>
          {question}
        </p>
        <p style={{ font: 'var(--font-caption)', color: 'var(--color-ink)' }}>
          {answer}
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// App — 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════
function App() {
  // State
  const [spaces, setSpaces] = useState([{ id: 'kitchen', name: '주방', icon: '🍳' }])
  const [selectedSpace, setSelectedSpace] = useState('kitchen')
  const [response, setResponse] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  // 공간 목록 로드
  useEffect(() => {
    fetchSpaces()
      .then((data) => {
        if (data?.length > 0) {
          setSpaces(data)
          setSelectedSpace(data[0].id)
        }
      })
      .catch((err) => console.error('Failed to fetch spaces:', err))
  }, [])

  // 핸들러
  const handleStart = async () => {
    setLoading(true)
    try {
      const result = await startSession(selectedSpace)
      setSessionId(result.sessionId)
      setResponse(result)
      setHistory([])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleSelect = async (option) => {
    setLoading(true)
    setHistory([...history, {
      question: response.needMoreInfo.question,
      answer: option.label,
    }])

    try {
      const axisId = response.needMoreInfo.axisId
      const result = await turn(sessionId, axisId, option.id)
      setResponse(result)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const result = await done(sessionId)
      setResponse(result)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleReset = () => {
    setResponse(null)
    setHistory([])
    setSessionId(null)
  }

  // 현재 공간 정보
  const currentSpace = spaces.find(s => s.id === selectedSpace) || spaces[0]

  return (
    <div style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 'var(--space-8) var(--space-4)',
    }}>
      {/* ─────────────────────────────────────────────────────────────────
          시작 화면
          ───────────────────────────────────────────────────────────────── */}
      {response === null && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 'var(--width-card)',
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--color-mint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-6)',
          }}>
            <span style={{ fontSize: 40 }}>✦</span>
          </div>

          <h1 style={{
            font: 'var(--font-display)',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-3)',
          }}>
            {currentSpace?.icon} {currentSpace?.name} 악취 진단
          </h1>

          <p style={{
            font: 'var(--font-body)',
            color: 'var(--color-ink-soft)',
            marginBottom: 'var(--space-8)',
          }}>
            몇 가지 질문에 답하면 냄새의 원인을 찾아드려요
          </p>

          <ActionButton onClick={handleStart} disabled={loading}>
            {loading ? '준비 중...' : '진단 시작하기'}
          </ActionButton>

          {/* 공간 선택 */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-8)',
          }}>
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => setSelectedSpace(space.id)}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-btn)',
                  background: space.id === selectedSpace
                    ? 'var(--color-mint-wash)'
                    : 'transparent',
                  border: space.id === selectedSpace
                    ? '1px solid var(--color-mint)'
                    : '1px solid var(--color-border)',
                  color: space.id === selectedSpace
                    ? 'var(--color-mint-deep)'
                    : 'var(--color-ink-soft)',
                  font: 'var(--font-caption)',
                }}
              >
                {space.icon} {space.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          질문 화면
          ───────────────────────────────────────────────────────────────── */}
      {response?.needMoreInfo && (
        <div style={{ width: '100%', maxWidth: 'var(--width-content)' }}>
          <Eyebrow>문제 발생 · 턴제 진단</Eyebrow>

          {/* 히스토리 */}
          {history.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-5)',
            }}>
              {history.map((item, i) => (
                <HistoryItem key={i} {...item} />
              ))}
            </div>
          )}

          <QuestionCard
            question={response.needMoreInfo.question}
            options={response.needMoreInfo.options}
            onSelect={handleSelect}
            disabled={loading}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          결과 화면
          ───────────────────────────────────────────────────────────────── */}
      {response?.hypotheses && (
        <div style={{ width: '100%', maxWidth: 'var(--width-content)' }}>
          <Eyebrow>진단 결과</Eyebrow>

          {/* 가정 경고 */}
          {response.assumed && (
            <AssumeBox reason={response.assumeReason} />
          )}

          <h2 style={{
            font: 'var(--font-display)',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-5)',
          }}>
            {response.assumed ? '추정 원인' : '예상 원인'}
          </h2>

          {/* 가설 카드들 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}>
            {response.hypotheses.map((h, i) => (
              <HypothesisCard key={h.id} hypothesis={h} rank={i + 1} />
            ))}
          </div>

          {/* 히스토리 요약 */}
          {history.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <p style={{
                font: 'var(--font-caption)',
                color: 'var(--color-ink-muted)',
                marginBottom: 'var(--space-3)',
              }}>
                수집한 정보
              </p>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}>
                {history.map((item, i) => (
                  <HistoryItem key={i} {...item} />
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <ActionButton onClick={handleFinish} disabled={loading}>
              {loading ? '처리 중...' : '진단 완료'}
            </ActionButton>
            <ActionButton variant="ghost" onClick={handleReset}>
              다시 시작
            </ActionButton>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          완료 화면
          ───────────────────────────────────────────────────────────────── */}
      {response?.done && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--color-mint-wash)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-6)',
          }}>
            <span style={{ fontSize: 40, color: 'var(--color-mint)' }}>✓</span>
          </div>

          <h1 style={{
            font: 'var(--font-display)',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-3)',
          }}>
            진단 완료
          </h1>

          <p style={{
            font: 'var(--font-body)',
            color: 'var(--color-ink-soft)',
            marginBottom: 'var(--space-6)',
          }}>
            수집한 정보를 바탕으로 원인을 분석했어요
          </p>

          <ActionButton onClick={handleReset}>
            새 진단 시작
          </ActionButton>
        </div>
      )}
    </div>
  )
}

export default App
