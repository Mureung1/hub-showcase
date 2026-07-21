import { useState } from 'react'

// 상태 알약(강점/기본/근거부족/미보유) — 여러 곳에서 재사용
export function StatusPill({ item }) {
  return (
    <span style={{ fontSize: 11, color: item.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.dot }} />
      {item.label}
    </span>
  )
}

// 요구역량 한 줄. 근거(why)가 있으면 펼침형(<details>), 없으면 단순 행.
//  accent = 'bright'(필수) | 'med'(우대) — 액션 박스 색을 결정.
export default function ReqItem({ r, accent = 'bright' }) {
  const [open, setOpen] = useState(false)
  const accentColor = accent === 'med' ? 'var(--blue-med)' : 'var(--blue-bright)'
  const accentRgb = accent === 'med' ? 'var(--blue-med-rgb)' : 'var(--blue-bright-rgb)'

  if (!r.hasEvidence) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12.5, padding: '5px 0' }}>
        <span style={{ color: 'var(--text)' }}>{r.name}</span>
        <StatusPill item={r} />
      </div>
    )
  }

  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} style={{ borderRadius: 7 }}>
      <summary className="req-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: 6, margin: '0 -6px', cursor: 'pointer', borderRadius: 7 }}>
        <span style={{ color: 'var(--text)', flex: 1 }}>{r.name}</span>
        <StatusPill item={r} />
        <span className="req-chevron" style={{ fontSize: 9, color: 'var(--text-faint)', transition: 'transform 0.18s ease, color 0.15s ease', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0, marginLeft: 2 }}>▾</span>
      </summary>

      <div style={{ margin: '6px 4px 12px 8px', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border-soft)', borderLeft: `2px solid ${r.color}`, borderRadius: 12 }}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 9px' }}>{r.why}</p>

        {r.hasAiBar && (
          <>
            <div style={{ display: 'flex', height: 24, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-soft)', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
              <div style={{ background: 'rgba(var(--blue-med-rgb),0.22)', color: 'var(--blue-med)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${r.aiAssistPct}%` }}>AI 작성 {r.aiAssistPct}%</div>
              <div style={{ background: 'rgba(var(--blue-bright-rgb),0.22)', color: 'var(--blue-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${r.aiSelfPct}%` }}>직접 {r.aiSelfPct}%</div>
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--text-dim)', lineHeight: 1.55, margin: '0 0 9px', background: 'var(--card-hi)', borderRadius: 6, padding: '7px 9px' }}>{r.aiNote}</p>
          </>
        )}

        {r.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 9 }}>
            {r.tags.map((t, i) => (
              <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, border: t.border, color: t.color, whiteSpace: 'nowrap' }}>{t.label}</span>
            ))}
          </div>
        )}

        {r.action && (
          <div style={{ padding: '8px 11px', borderRadius: 12, background: `rgba(${accentRgb},0.14)`, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, whiteSpace: 'nowrap', flexShrink: 0 }}>{r.actionLabel}</span>
            <span>{r.action}</span>
          </div>
        )}
      </div>
    </details>
  )
}
