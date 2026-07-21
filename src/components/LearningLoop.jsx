import { StatusPill } from './ReqItem.jsx'

// 학습 루프 — 2열: 복습(까먹기 방지) / 새로 학습(갭 채우기)
const loopCard = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px 16px 14px' }
const loopHeader = { display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 700, paddingBottom: 12, marginBottom: 4, borderBottom: '1px solid var(--border-soft)' }
const countPill = { marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', background: 'var(--card-hi)', borderRadius: 20, padding: '1px 9px' }
const loopItem = { padding: '11px 0', borderBottom: '1px solid var(--border-soft)' }

function Chips({ chips }) {
  if (!chips || !chips.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
      {chips.map((c, i) => (
        <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: `1px solid ${c.border}`, color: c.color, whiteSpace: 'nowrap' }}>{c.label}</span>
      ))}
    </div>
  )
}

export default function LearningLoop({ review, fresh }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* 복습 · 까먹기 방지 */}
      <div style={loopCard}>
        <div style={loopHeader}>
          <span style={{ width: 24, height: 24, borderRadius: 10, background: 'rgba(var(--blue-bright-rgb),0.22)', color: 'var(--blue-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↻</span>
          복습 · 까먹기 방지 <span style={countPill}>{review.length}</span>
        </div>
        {review.map((l, i) => (
          <div key={i} style={loopItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</span>
              <span style={{ marginLeft: 'auto' }}><StatusPill item={l} /></span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 6 }}>{l.provenance}</div>
            <Chips chips={l.chips} />
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{l.note}</div>
          </div>
        ))}
      </div>

      {/* 새로 학습 · 갭 채우기 */}
      <div style={loopCard}>
        <div style={loopHeader}>
          <span style={{ width: 24, height: 24, borderRadius: 10, background: 'rgba(var(--blue-med-rgb),0.22)', color: 'var(--blue-med)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>＋</span>
          새로 학습 · 갭 채우기 <span style={countPill}>{fresh.length}</span>
        </div>
        {fresh.map((l, i) => (
          <div key={i} style={{ ...loopItem, ...(l.isVision ? { background: 'rgba(var(--blue-bright-rgb),0.14)', marginTop: 8, padding: '11px 12px', borderRadius: 8, borderBottom: 'none' } : {}) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</span>
              {l.hasStatus ? (
                <span style={{ marginLeft: 'auto' }}><StatusPill item={l} /></span>
              ) : (
                <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(var(--blue-bright-rgb),0.3)', color: 'var(--blue-bright)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{l.label}</span>
              )}
            </div>
            <Chips chips={l.chips} />
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{l.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
