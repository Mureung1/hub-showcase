/* ═══════════════════════════════════════════════════════════════════════════
   App.jsx — 자취방 청결관리사
   프로토타입 기반 리디자인 + BE 연결
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react'
import { startSession, turn, done, fetchSpaces, fetchHistory } from './api.js'
import './design/global.css'

// ═══════════════════════════════════════════════════════════════════════════
// confidence 라벨 매핑
// ═══════════════════════════════════════════════════════════════════════════
const CONFIDENCE = {
  most_likely: { label: '유력', width: '82%' },
  possible: { label: '보통', width: '55%' },
  unlikely: { label: '낮음', width: '30%' },
}

// ═══════════════════════════════════════════════════════════════════════════
// 날짜 유틸
// ═══════════════════════════════════════════════════════════════════════════
function formatDateKey(dateStr) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return '오늘'
  if (date.toDateString() === yesterday.toDateString()) return '어제'
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function groupSessionsByDate(sessions) {
  const groups = {}
  for (const session of sessions) {
    const key = formatDateKey(session.created_at)
    if (!groups[key]) {
      groups[key] = { date: session.created_at, sessions: [] }
    }
    groups[key].sessions.push(session)
  }
  return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
}

// ═══════════════════════════════════════════════════════════════════════════
// BackgroundPattern — 배경 패턴
// ═══════════════════════════════════════════════════════════════════════════
function BackgroundPattern() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      backgroundColor: 'var(--color-paper)',
      backgroundImage: `
        radial-gradient(1200px 600px at 80% -10%, #dff0ec 0%, transparent 60%),
        radial-gradient(900px 500px at 0% 110%, #e6f4ef 0%, transparent 55%),
        repeating-linear-gradient(0deg, rgba(10,133,119,.08) 0px, rgba(10,133,119,.08) 1px, transparent 1px, transparent 58px),
        repeating-linear-gradient(90deg, rgba(10,133,119,.08) 0px, rgba(10,133,119,.08) 1px, transparent 1px, transparent 58px)
      `,
    }}>
      {/* 장식 블롭 */}
      <div style={{
        position: 'absolute',
        top: -30,
        left: -24,
        width: 130,
        height: 110,
        borderRadius: '58% 42% 51% 49% / 45% 55% 42% 58%',
        background: 'radial-gradient(circle at 35% 30%, rgba(18,179,160,.16), rgba(18,179,160,.05) 70%)',
      }} />
      <div style={{
        position: 'absolute',
        top: 20,
        right: -34,
        width: 96,
        height: 84,
        borderRadius: '48% 52% 60% 40% / 55% 45% 58% 42%',
        background: 'radial-gradient(circle at 60% 40%, rgba(240,161,50,.14), rgba(240,161,50,.04) 70%)',
      }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Nav — 네비게이션
// ═══════════════════════════════════════════════════════════════════════════
function Nav({ onShowHistory, onStartDiagnosis }) {
  return (
    <nav style={{
      maxWidth: 'var(--width-container)',
      margin: '0 auto',
      padding: '22px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* 로고 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        fontSize: 17,
      }}>
        <span style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: 'linear-gradient(150deg, #12b3a0, #0a8577)',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontSize: 15,
          boxShadow: '0 4px 12px -3px rgba(10,133,119,.55)',
        }}>✦</span>
        자취방 청결관리사
      </div>

      {/* 메뉴 */}
      <div style={{
        display: 'flex',
        gap: 28,
        fontSize: 14,
        color: 'var(--color-ink-soft)',
      }}>
        <button onClick={onStartDiagnosis} style={{ font: 'var(--font-nav)', color: 'inherit' }}>
          부엌
        </button>
        <button onClick={onShowHistory} style={{ font: 'var(--font-nav)', color: 'inherit' }}>
          지난 기록
        </button>
      </div>

      {/* CTA */}
      <button
        onClick={onStartDiagnosis}
        style={{
          backgroundColor: 'var(--color-dark)',
          color: 'var(--color-dark-text)',
          padding: '9px 18px',
          borderRadius: 11,
          fontSize: 13.5,
          fontWeight: 700,
          transition: 'background-color var(--transition-fast)',
        }}
      >
        문제 진단하기
      </button>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Hero — 히어로 섹션
// ═══════════════════════════════════════════════════════════════════════════
function Hero({ onStartDiagnosis, onShowHistory }) {
  return (
    <section style={{
      maxWidth: 'var(--width-container)',
      margin: '0 auto',
      padding: '40px 32px 20px',
      textAlign: 'center',
    }}>
      <h1 style={{
        font: 'var(--font-display)',
        letterSpacing: '-0.03em',
        margin: '0 0 18px',
      }}>
        집에 무슨 일이 생기면,<br />
        <span style={{ color: 'var(--color-mint-deep)', position: 'relative', whiteSpace: 'nowrap' }}>
          원인부터 같이
        </span> 찾아드려요
      </h1>
      <p style={{
        fontSize: 'clamp(15px, 2vw, 18px)',
        color: 'var(--color-ink-soft)',
        maxWidth: 600,
        margin: '0 auto 26px',
      }}>
        초파리, 냄새, 곰팡이 — 뭐부터 확인해야 할지 막막할 때.<br />
        물어보면 상황을 짚어 원인을 진단하고, 해결까지 함께 갑니다.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onStartDiagnosis}
          style={{
            border: 'none',
            borderRadius: 13,
            padding: '15px 26px',
            fontWeight: 700,
            fontSize: 15,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--color-dark)',
            color: 'var(--color-dark-text)',
            transition: 'background-color var(--transition-fast), transform var(--transition-fast)',
          }}
        >
          지금 문제 진단하기 →
        </button>
        <button
          onClick={onShowHistory}
          style={{
            border: '1.5px solid var(--color-border)',
            borderRadius: 13,
            padding: '15px 26px',
            fontWeight: 700,
            fontSize: 15,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#fff',
            color: 'var(--color-ink)',
            transition: 'border-color var(--transition-fast), color var(--transition-fast)',
          }}
        >
          지난 기록 보기
        </button>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SpaceCard — 공간 선택 카드 (사이드바)
// ═══════════════════════════════════════════════════════════════════════════
function SpaceCard({ space, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 13,
        borderRadius: 16,
        cursor: 'pointer',
        marginBottom: 8,
        backgroundColor: isSelected ? '#fff' : 'transparent',
        border: `1px solid ${isSelected ? 'var(--color-mint)' : 'transparent'}`,
        boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        background: 'var(--color-mint-soft)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {space.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 14.5, display: 'block' }}>{space.name}</b>
        <span style={{
          fontSize: 12,
          color: space.hasIssue ? 'var(--color-amber)' : 'var(--color-ink-soft)',
          fontWeight: space.hasIssue ? 600 : 400,
        }}>
          {space.detail || '확인 대기'}
        </span>
      </div>
      {space.pill && (
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 20,
          background: 'var(--color-mint-soft)',
          color: 'var(--color-mint-deep)',
          whiteSpace: 'nowrap',
        }}>
          {space.pill}
        </span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// StageHeader — 오른쪽 메인 영역 헤더
// ═══════════════════════════════════════════════════════════════════════════
function StageHeader({ eyebrow, title, sub, onReset, showReset, step, totalSteps }) {
  return (
    <div style={{
      padding: '22px 30px',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    }}>
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          font: 'var(--font-eyebrow)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-mint-deep)',
          marginBottom: 6,
        }}>
          <span style={{
            width: 13,
            height: 2,
            background: 'var(--color-mint)',
            display: 'inline-block',
            borderRadius: 2,
          }} />
          {eyebrow}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {showReset && (
          <button
            onClick={onReset}
            style={{
              fontSize: 12.5,
              color: 'var(--color-ink-soft)',
              borderBottom: '1px dotted var(--color-ink-soft)',
            }}
          >
            새로 시작
          </button>
        )}
        {totalSteps > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                style={{
                  height: 8,
                  borderRadius: 6,
                  background: i === step ? 'var(--color-mint)' : 'var(--color-border)',
                  width: i === step ? 22 : 8,
                  transition: 'var(--transition-fast)',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ProbeButton — 빠른확인 버튼
// ═══════════════════════════════════════════════════════════════════════════
function ProbeButton({ emoji, label, onClick, variant = 'default' }) {
  const colors = {
    default: { border: 'var(--color-border)', hoverBorder: 'var(--color-border)', hoverBg: '#fff' },
    ok: { border: 'var(--color-border)', hoverBorder: 'var(--color-mint)', hoverBg: 'var(--color-mint-soft)' },
    mid: { border: 'var(--color-border)', hoverBorder: 'var(--color-amber)', hoverBg: 'var(--color-amber-wash)' },
    bad: { border: 'var(--color-border)', hoverBorder: 'var(--color-alarm)', hoverBg: 'var(--color-alarm-wash)' },
  }
  const c = colors[variant]

  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        border: `1.5px solid ${c.border}`,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: '18px 8px',
        textAlign: 'center',
        font: 'inherit',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = c.hoverBorder
        e.currentTarget.style.backgroundColor = c.hoverBg
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = c.border
        e.currentTarget.style.backgroundColor = '#fff'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <span style={{ fontSize: 26, display: 'block', marginBottom: 7 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-soft)' }}>{label}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// QuickCheckCard — 빠른 확인하기 카드
// ═══════════════════════════════════════════════════════════════════════════
function QuickCheckCard({ space, onOk, onMid, onBad, probeNote, loading }) {
  return (
    <div
      className="animate-rise"
      style={{
        backgroundColor: '#fff',
        backgroundImage: 'linear-gradient(160deg, var(--color-mint-soft), #fff)',
        border: '1px solid var(--color-mint)',
        borderRadius: 20,
        padding: 26,
        maxWidth: 'var(--width-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-mint-deep)', letterSpacing: '0.06em', marginBottom: 8 }}>
        빠른 확인하기
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>
        {space?.icon} {space?.name} 배수구 확인한 지 3주 됐어요.
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--color-ink-soft)', marginBottom: 20 }}>
        지금 상태 어때요?
      </div>
      <div style={{ display: 'flex', gap: 12, opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
        <ProbeButton emoji="👍" label="괜찮아요" onClick={onOk} variant="ok" />
        <ProbeButton emoji="👀" label="좀 신경 쓰여요" onClick={onMid} variant="mid" />
        <ProbeButton emoji="🔧" label="문제 있어요" onClick={onBad} variant="bad" />
      </div>
      {probeNote && (
        <div style={{ marginTop: 16, fontSize: 13.5, color: 'var(--color-mint-deep)', fontWeight: 600 }}>
          {probeNote}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ChatBubble — 대화 말풍선
// ═══════════════════════════════════════════════════════════════════════════
function ChatBubble({ isUser, label, children }) {
  return (
    <div style={{
      maxWidth: '80%',
      padding: '14px 16px',
      borderRadius: 16,
      fontSize: 14.5,
      lineHeight: 1.5,
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      background: isUser ? 'var(--color-dark)' : 'var(--color-mint-soft)',
      color: isUser ? 'var(--color-dark-text)' : 'var(--color-ink)',
      borderBottomRightRadius: isUser ? 5 : 16,
      borderBottomLeftRadius: isUser ? 16 : 5,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        opacity: 0.55,
        marginBottom: 5,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// AssumeBox — 가정 알림 박스
// ═══════════════════════════════════════════════════════════════════════════
function AssumeBox({ reason }) {
  return (
    <div style={{
      background: 'var(--color-amber-wash)',
      border: '1px dashed var(--color-amber)',
      borderRadius: 12,
      padding: '13px 16px',
      fontSize: 13.5,
      color: '#7a531a',
      maxWidth: 'var(--width-content)',
      marginBottom: 16,
    }}>
      <b style={{ color: 'var(--color-amber)' }}>이건 이렇게 보고 진행할게요</b> · {reason || '자취방은 보통 배수구 트랩이 없더라고요. 없다고 가정하고 볼게요.'}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HypothesisCard — 가설 카드
// ═══════════════════════════════════════════════════════════════════════════
function HypothesisCard({ hypothesis, onSelect, loading }) {
  const conf = CONFIDENCE[hypothesis.confidence] || CONFIDENCE.unlikely

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: 18,
      backgroundColor: '#fff',
      boxShadow: 'var(--shadow-card)',
      transition: 'all var(--transition-normal)',
      maxWidth: 'var(--width-content)',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-mint-deep)', letterSpacing: '0.08em' }}>
          가장 유력한 원인
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--color-ink-soft)' }}>
          {conf.label}
          <span style={{
            width: 60,
            height: 6,
            background: 'var(--color-border)',
            borderRadius: 4,
            overflow: 'hidden',
            display: 'inline-block',
          }}>
            <i style={{
              display: 'block',
              height: '100%',
              width: conf.width,
              background: 'linear-gradient(90deg, var(--color-mint), var(--color-mint-deep))',
            }} />
          </span>
        </span>
      </div>

      {/* 내용 */}
      <h3 style={{ fontSize: 16, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        {hypothesis.cause}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: '0 0 15px' }}>
        {hypothesis.evidence}
      </p>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', opacity: loading ? 0.5 : 1 }}>
        <button
          onClick={() => onSelect({ id: 'yes', label: '예' })}
          disabled={loading}
          style={{
            border: '1.5px solid var(--color-border)',
            backgroundColor: '#fff',
            borderRadius: 11,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-ink-soft)',
            transition: 'all var(--transition-fast)',
          }}
        >
          해봤어요
        </button>
        <button
          onClick={() => onSelect({ id: 'no', label: '아니오' })}
          disabled={loading}
          style={{
            border: '1.5px solid var(--color-border)',
            backgroundColor: '#fff',
            borderRadius: 11,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-ink-soft)',
            transition: 'all var(--transition-fast)',
          }}
        >
          해당 없어요
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// QuestionCard — 질문 카드
// ═══════════════════════════════════════════════════════════════════════════
function QuestionCard({ question, options, onSelect, disabled, isVerify }) {
  if (isVerify) {
    return (
      <div
        className="animate-rise"
        style={{
          border: '1px solid var(--color-mint)',
          background: 'var(--color-mint-soft)',
          borderRadius: 12,
          padding: '14px 16px',
          maxWidth: 'var(--width-content)',
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
          {question}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelect(opt)}
              disabled={disabled}
              style={{
                border: '1.5px solid var(--color-border)',
                background: '#fff',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-ink-soft)',
                transition: 'var(--transition-fast)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="animate-rise"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 18,
        backgroundColor: '#fff',
        boxShadow: 'var(--shadow-card)',
        maxWidth: 'var(--width-content)',
      }}
    >
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
              border: '1px solid var(--color-border)',
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
// HistoryItem — 대화 히스토리 항목
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
        <p style={{ font: 'var(--font-body)', color: 'var(--color-ink-soft)', fontSize: 12 }}>
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
// CompletionScreen — 완료 화면
// ═══════════════════════════════════════════════════════════════════════════
function CompletionScreen({ space, history, onReset }) {
  return (
    <div className="animate-rise" style={{ maxWidth: 'var(--width-card)' }}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'linear-gradient(150deg, var(--color-mint), var(--color-mint-deep))',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: 30,
        marginBottom: 16,
        boxShadow: '0 10px 24px -10px rgba(10,133,119,.7)',
      }}>✓</div>

      <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
        진단을 마쳤어요
      </h3>
      <p style={{ color: 'var(--color-ink-soft)', margin: '0 0 22px' }}>
        이번 기록은 다음에 같은 문제가 생겼을 때 더 정확한 판단의 근거가 됩니다.
      </p>

      {/* 요약 카드 */}
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', fontSize: 14.5, borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-ink-soft)' }}>문제</span>
          <b>{space?.name} · 악취 진단</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', fontSize: 14.5, borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ color: 'var(--color-ink-soft)' }}>주고받은 대화</span>
          <b>{history.length}번</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', fontSize: 14.5 }}>
          <span style={{ color: 'var(--color-ink-soft)' }}>마무리</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--color-mint-soft)', color: 'var(--color-mint-deep)' }}>
            해결 완료
          </span>
        </div>
      </div>

      {/* 후속 알림 */}
      <div style={{
        background: 'var(--color-tile-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: '16px 18px',
        fontSize: 13.5,
        color: 'var(--color-ink-soft)',
        lineHeight: 1.6,
        marginBottom: 20,
      }}>
        <b style={{ color: 'var(--color-ink)', display: 'block', marginBottom: 6, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          며칠 뒤 다시 확인할게요
        </b>
        3일 뒤 · "다시 문제가 생겼나요?" 한 번만 눌러 확인.
      </div>

      <button
        onClick={onReset}
        style={{
          border: 'none',
          background: 'var(--color-dark)',
          color: 'var(--color-dark-text)',
          fontWeight: 700,
          fontSize: 15,
          padding: '14px 24px',
          borderRadius: 13,
          cursor: 'pointer',
        }}
      >
        홈으로
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HistoryDeck — 이전 기록 화면
// ═══════════════════════════════════════════════════════════════════════════
function HistoryDeck({ sessions, space, onBack, loading }) {
  const groups = groupSessionsByDate(sessions)

  return (
    <div className="animate-rise" style={{ maxWidth: 'var(--width-content)' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) 0',
          marginBottom: 'var(--space-5)',
          font: 'var(--font-caption)',
          color: 'var(--color-ink-soft)',
        }}
      >
        ← 돌아가기
      </button>

      <h2 style={{ font: 'var(--font-title-lg)', marginBottom: 'var(--space-5)' }}>
        {space?.icon} {space?.name} 진단 기록
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-ink-soft)' }}>
          불러오는 중...
        </div>
      ) : sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-10) var(--space-4)',
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
        }}>
          <span style={{ fontSize: 48, marginBottom: 'var(--space-4)', display: 'block' }}>📋</span>
          <p style={{ color: 'var(--color-ink-soft)' }}>아직 기록이 없어요</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={formatDateKey(group.date)} style={{ marginBottom: 'var(--space-6)' }}>
            {/* 날짜 헤더 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-3)',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-mint)' }} />
              <span style={{ font: 'var(--font-caption)', fontWeight: 700 }}>
                {formatDateLabel(group.date)}
              </span>
              <span style={{ font: 'var(--font-caption)', color: 'var(--color-ink-muted)' }}>
                {group.sessions.length}건
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            {/* 세션 카드들 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginLeft: 'var(--space-5)' }}>
              {group.sessions.map((session) => (
                <div
                  key={session.session_id}
                  style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4)',
                    borderLeft: '3px solid var(--color-mint)',
                  }}
                >
                  <h4 style={{ font: 'var(--font-title)', marginBottom: 'var(--space-2)' }}>
                    {session.final_label}
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--color-ink-soft)', lineHeight: 1.5 }}>
                    {session.solution}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Toast — 에러/정보 알림
// ═══════════════════════════════════════════════════════════════════════════
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const isError = toast.variant === 'error'

  return (
    <div
      className="animate-fade"
      style={{
        position: 'fixed',
        top: 'var(--space-4)',
        right: 'var(--space-4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        background: isError ? 'var(--color-alarm-wash)' : 'var(--color-mint-soft)',
        border: `1px solid ${isError ? 'var(--color-alarm)' : 'var(--color-mint)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-float)',
        maxWidth: 320,
      }}
      role="alert"
    >
      <span style={{ fontSize: 16 }}>{isError ? '⚠️' : 'ℹ️'}</span>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 14,
          color: isError ? 'var(--color-alarm-deep)' : 'var(--color-mint-deep)',
        }}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onClose}
        style={{ color: 'var(--color-ink-muted)', padding: 0, fontSize: 16, lineHeight: 1 }}
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// App — 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════
function App() {
  // 상태
  const [spaces, setSpaces] = useState([
    { id: 'kitchen', name: '부엌', icon: '🍳', hasIssue: true, detail: '21일째 확인 안 함', pill: null },
  ])
  const [selectedSpace, setSelectedSpace] = useState('kitchen')
  const [screen, setScreen] = useState('home') // home, probe, diagnosis, history, done
  const [response, setResponse] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [toast, setToast] = useState(null)
  const [probeNote, setProbeNote] = useState(null)
  const [pastSessions, setPastSessions] = useState([])

  // 공간 목록 로드
  useEffect(() => {
    fetchSpaces()
      .then((data) => {
        if (data?.length > 0) {
          setSpaces(data.map(s => ({
            ...s,
            hasIssue: false,
            detail: '확인 대기',
            pill: '양호',
          })))
          setSelectedSpace(data[0].id)
        }
      })
      .catch(() => {
        // 기본값 유지
      })
  }, [])

  // 현재 공간
  const currentSpace = spaces.find(s => s.id === selectedSpace) || spaces[0]

  // ─────────────────────────────────────────────────────────────────────────
  // 핸들러
  // ─────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setScreen('home')
    setResponse(null)
    setHistory([])
    setSessionId(null)
    setProbeNote(null)
  }

  const handleStartDiagnosis = () => {
    setScreen('probe')
    setProbeNote(null)
  }

  const handleShowHistory = async () => {
    setScreen('history')
    setLoading(true)
    try {
      const sessions = await fetchHistory(selectedSpace)
      setPastSessions(sessions)
    } catch {
      setToast({ variant: 'error', message: '이력을 불러오지 못했어요.' })
      setPastSessions([])
    }
    setLoading(false)
  }

  const handleProbeOk = () => {
    setProbeNote('좋아요, 계속 지켜볼게요 — 다음에 또 여쭤볼게요.')
  }

  const handleProbeMid = async () => {
    await startDiagnosisSession()
  }

  const handleProbeBad = async () => {
    await startDiagnosisSession()
  }

  const startDiagnosisSession = async () => {
    setLoading(true)
    try {
      const result = await startSession(selectedSpace)
      setSessionId(result.sessionId)
      setResponse(result)
      setHistory([])
      setScreen('diagnosis')
    } catch {
      setToast({ variant: 'error', message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' })
    }
    setLoading(false)
  }

  const handleSelect = async (option) => {
    setLoading(true)
    setHistory([...history, {
      question: response.needMoreInfo?.question,
      answer: option.label,
    }])

    try {
      const axisId = response.needMoreInfo?.axisId
      const result = await turn(sessionId, axisId, option.id)
      setResponse(result)
    } catch {
      setToast({ variant: 'error', message: '응답을 처리하지 못했어요. 다시 시도해 주세요.' })
    }
    setLoading(false)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      await done(sessionId)
      setScreen('done')
    } catch {
      setToast({ variant: 'error', message: '진단을 완료하지 못했어요. 다시 시도해 주세요.' })
    }
    setLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 화면 메타
  // ─────────────────────────────────────────────────────────────────────────
  const screenMeta = {
    home: { eyebrow: '시작하기', title: '무슨 일이 있으셨어요?', sub: '공간을 선택하고 빠른 확인을 시작하세요', step: -1 },
    probe: { eyebrow: '1 · 빠른 확인', title: `${currentSpace?.name}, 잠깐 확인해볼까요?`, sub: '탭 한 번이면 됩니다', step: 0 },
    diagnosis: { eyebrow: '2 · 원인 찾기', title: '같이 원인을 찾아봐요', sub: '유력한 원인부터 하나씩 짚어드려요', step: 1 },
    history: { eyebrow: '이전 기록', title: '지난 진단 기록', sub: '과거에 해결한 문제들', step: -1 },
    done: { eyebrow: '4 · 마무리', title: '진단 완료', sub: '기록이 다음 판단으로 이어집니다', step: 3 },
  }
  const meta = screenMeta[screen]

  // ─────────────────────────────────────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <BackgroundPattern />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <Nav
          onShowHistory={handleShowHistory}
          onStartDiagnosis={handleStartDiagnosis}
        />

        {/* 홈 화면: 히어로 + 메인 카드 */}
        {screen === 'home' && (
          <>
            <Hero onStartDiagnosis={handleStartDiagnosis} onShowHistory={handleShowHistory} />

            {/* 메인 카드 영역 */}
            <div style={{
              maxWidth: 'var(--width-container)',
              margin: '26px auto 0',
              padding: '0 32px 60px',
            }}>
              <div style={{
                position: 'relative',
                backgroundColor: '#fff',
                border: '1px solid var(--color-border)',
                borderRadius: 26,
                boxShadow: 'var(--shadow-hero)',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                minHeight: 500,
              }}>
                {/* 사이드바 */}
                <aside style={{
                  background: 'var(--color-sidebar)',
                  borderRight: '1px solid var(--color-border)',
                  padding: '26px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--color-ink-soft)', margin: '0 0 16px' }}>
                    내 집 상태
                  </h2>
                  {spaces.map((space) => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      isSelected={space.id === selectedSpace}
                      onClick={() => setSelectedSpace(space.id)}
                    />
                  ))}
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: 20,
                    fontSize: 12,
                    color: 'var(--color-ink-soft)',
                    lineHeight: 1.6,
                    borderTop: '1px solid var(--color-border)',
                  }}>
                    별다른 입력이 없으면 잘 지내는 걸로 볼게요.
                  </div>
                </aside>

                {/* 메인 콘텐츠 */}
                <main style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                  <StageHeader {...meta} onReset={handleReset} showReset={false} totalSteps={0} />
                  <div style={{ padding: 30, flex: 1, overflow: 'auto' }}>
                    <QuickCheckCard
                      space={currentSpace}
                      onOk={handleProbeOk}
                      onMid={handleProbeMid}
                      onBad={handleProbeBad}
                      probeNote={probeNote}
                      loading={loading}
                    />
                  </div>
                </main>
              </div>
            </div>
          </>
        )}

        {/* 빠른 확인 화면 */}
        {screen === 'probe' && (
          <div style={{
            maxWidth: 'var(--width-container)',
            margin: '26px auto 0',
            padding: '0 32px 60px',
          }}>
            <div style={{
              position: 'relative',
              backgroundColor: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 26,
              boxShadow: 'var(--shadow-hero)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '300px 1fr',
              minHeight: 500,
            }}>
              {/* 사이드바 */}
              <aside style={{
                background: 'var(--color-sidebar)',
                borderRight: '1px solid var(--color-border)',
                padding: '26px 22px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--color-ink-soft)', margin: '0 0 16px' }}>
                  내 집 상태
                </h2>
                {spaces.map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isSelected={space.id === selectedSpace}
                    onClick={() => setSelectedSpace(space.id)}
                  />
                ))}
              </aside>

              {/* 메인 콘텐츠 */}
              <main style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                <StageHeader {...meta} onReset={handleReset} showReset={true} totalSteps={4} />
                <div style={{ padding: 30, flex: 1, overflow: 'auto' }}>
                  <QuickCheckCard
                    space={currentSpace}
                    onOk={handleProbeOk}
                    onMid={handleProbeMid}
                    onBad={handleProbeBad}
                    probeNote={probeNote}
                    loading={loading}
                  />
                </div>
              </main>
            </div>
          </div>
        )}

        {/* 진단 화면 */}
        {screen === 'diagnosis' && (
          <div style={{
            maxWidth: 'var(--width-container)',
            margin: '26px auto 0',
            padding: '0 32px 60px',
          }}>
            <div style={{
              position: 'relative',
              backgroundColor: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 26,
              boxShadow: 'var(--shadow-hero)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '300px 1fr',
              minHeight: 500,
            }}>
              {/* 사이드바 */}
              <aside style={{
                background: 'var(--color-sidebar)',
                borderRight: '1px solid var(--color-border)',
                padding: '26px 22px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--color-ink-soft)', margin: '0 0 16px' }}>
                  내 집 상태
                </h2>
                {spaces.map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isSelected={space.id === selectedSpace}
                    onClick={() => setSelectedSpace(space.id)}
                  />
                ))}
              </aside>

              {/* 메인 콘텐츠 */}
              <main style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                <StageHeader {...meta} onReset={handleReset} showReset={true} totalSteps={4} />
                <div style={{ padding: 30, flex: 1, overflow: 'auto' }}>
                  <div className="animate-rise">
                    {/* 대화 히스토리 */}
                    {history.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20, maxWidth: 'var(--width-content)' }}>
                        <ChatBubble isUser label="나">
                          {currentSpace?.icon} {currentSpace?.name}에서 문제가 있어요
                        </ChatBubble>
                        {history.map((item, i) => (
                          <ChatBubble key={i} isUser label="나">
                            {item.answer}
                          </ChatBubble>
                        ))}
                        <ChatBubble isUser={false} label="청결관리사">
                          알겠어요! 몇 가지 흔한 원인부터 짚어볼게요.
                        </ChatBubble>
                      </div>
                    )}

                    {/* 가정 박스 */}
                    {response?.assumed && (
                      <AssumeBox reason={response.assumeReason} />
                    )}

                    {/* 질문 or 가설 */}
                    {response?.needMoreInfo && (
                      <QuestionCard
                        question={response.needMoreInfo.question}
                        options={response.needMoreInfo.options}
                        onSelect={handleSelect}
                        disabled={loading}
                        isVerify={response.needMoreInfo.axisId?.startsWith('verify_')}
                      />
                    )}

                    {response?.hypotheses && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {response.hypotheses.map((h, i) => (
                          <HypothesisCard
                            key={h.id || i}
                            hypothesis={h}
                            onSelect={handleSelect}
                            loading={loading}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 하단 버튼 */}
                {response?.hypotheses && (
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    padding: '18px 30px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                  }}>
                    <button
                      onClick={handleFinish}
                      disabled={loading}
                      style={{
                        border: 'none',
                        background: 'var(--color-dark)',
                        color: 'var(--color-dark-text)',
                        fontWeight: 700,
                        fontSize: 15,
                        padding: '14px 24px',
                        borderRadius: 13,
                      }}
                    >
                      {loading ? '처리 중...' : '이대로 마치기'}
                    </button>
                  </div>
                )}
              </main>
            </div>
          </div>
        )}

        {/* 완료 화면 */}
        {screen === 'done' && (
          <div style={{
            maxWidth: 'var(--width-container)',
            margin: '26px auto 0',
            padding: '0 32px 60px',
          }}>
            <div style={{
              position: 'relative',
              backgroundColor: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 26,
              boxShadow: 'var(--shadow-hero)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '300px 1fr',
              minHeight: 500,
            }}>
              {/* 사이드바 */}
              <aside style={{
                background: 'var(--color-sidebar)',
                borderRight: '1px solid var(--color-border)',
                padding: '26px 22px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--color-ink-soft)', margin: '0 0 16px' }}>
                  내 집 상태
                </h2>
                {spaces.map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isSelected={space.id === selectedSpace}
                    onClick={() => setSelectedSpace(space.id)}
                  />
                ))}
              </aside>

              {/* 메인 콘텐츠 */}
              <main style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                <StageHeader {...meta} onReset={handleReset} showReset={false} totalSteps={4} />
                <div style={{ padding: 30, flex: 1, overflow: 'auto' }}>
                  <CompletionScreen space={currentSpace} history={history} onReset={handleReset} />
                </div>
              </main>
            </div>
          </div>
        )}

        {/* 이전 기록 화면 */}
        {screen === 'history' && (
          <div style={{
            maxWidth: 'var(--width-container)',
            margin: '26px auto 0',
            padding: '0 32px 60px',
          }}>
            <div style={{
              position: 'relative',
              backgroundColor: '#fff',
              border: '1px solid var(--color-border)',
              borderRadius: 26,
              boxShadow: 'var(--shadow-hero)',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '300px 1fr',
              minHeight: 500,
            }}>
              {/* 사이드바 */}
              <aside style={{
                background: 'var(--color-sidebar)',
                borderRight: '1px solid var(--color-border)',
                padding: '26px 22px',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: 'var(--color-ink-soft)', margin: '0 0 16px' }}>
                  내 집 상태
                </h2>
                {spaces.map((space) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isSelected={space.id === selectedSpace}
                    onClick={() => setSelectedSpace(space.id)}
                  />
                ))}
              </aside>

              {/* 메인 콘텐츠 */}
              <main style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                <StageHeader {...meta} onReset={handleReset} showReset={false} totalSteps={0} />
                <div style={{ padding: 30, flex: 1, overflow: 'auto' }}>
                  <HistoryDeck
                    sessions={pastSessions}
                    space={currentSpace}
                    onBack={handleReset}
                    loading={loading}
                  />
                </div>
              </main>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
