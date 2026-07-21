import { useState } from 'react'
import ReqItem, { StatusPill } from './ReqItem.jsx'

// 재사용 스타일 조각
const panel = { background: 'var(--panel-bg)', border: '1px solid var(--border-soft)', borderRadius: 16, padding: '16px 16px 14px' }
const panelPad16 = { ...panel, padding: 16 }
const panelLabel = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', marginBottom: 12 }
const subLabel = { fontSize: 10.5, color: 'var(--text-faint)', margin: '6px 0 2px', textTransform: 'uppercase', letterSpacing: '0.03em' }
const provenance = { fontSize: 10.5, color: 'var(--text-faint)', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }

// 공고 카드 하나 = <details>. 펼치면 게이트/비게이트에 따라 다른 본문.
export default function JobCard({ job }) {
  const [open, setOpen] = useState(!!job.openDefault)
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `4px solid ${job.tierColor}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(25,31,40,0.06)', animation: 'fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <summary style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto auto', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: job.tierBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: job.tierColor }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontSize: 15.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{job.company}</span>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 500 }}>{job.role}</span>
              {job.isNew && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue-bright)', background: 'rgba(var(--blue-bright-rgb),0.12)', borderRadius: 8, padding: '2px 8px', letterSpacing: '0.02em' }}>NEW</span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{job.source}</div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap', paddingRight: 4 }}>
            {job.isGate ? (
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>경력 <b style={{ fontSize: 16, color: 'var(--coral)' }}>게이트</b></div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>적합도 <b style={{ fontSize: 16, color: job.tierColor }}>{job.fit}</b></div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 3 }}>{job.gapNote}</div>
          </div>
          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12, background: job.tierBg, color: job.tierColor }}>{job.deadlineTag}</span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-faint)', marginTop: 6 }}>{job.deadlineSub}</span>
          </div>
        </div>
      </summary>

      {job.isGate ? <GateBody job={job} /> : <FitBody job={job} />}
    </details>
  )
}

// 비게이트: 3열 (요구역량 · 나의 적합도 · 갭→뭐부터)
function FitBody({ job }) {
  return (
    <div style={{ padding: '4px 20px 24px', borderTop: '1px solid var(--border-soft)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 18 }}>
        <div style={panel}>
          <div style={panelLabel}>이 공고가 요구하는 역량</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', margin: '-4px 0 10px', lineHeight: 1.4 }}>▾ 표시된 항목을 클릭하면 근거·내 갭이 펼쳐집니다</div>
          <div style={subLabel}>필수</div>
          {job.reqRequired.map((r, i) => <ReqItem key={i} r={r} accent="bright" />)}
          {job.hasPreferred && (
            <>
              <div style={{ ...subLabel, marginTop: 10 }}>우대</div>
              {job.reqPreferred.map((r, i) => <ReqItem key={i} r={r} accent="med" />)}
            </>
          )}
        </div>

        <FitPanel job={job} />
        <GapActions job={job} />
      </div>
      <div style={provenance}>{job.provenance}</div>
    </div>
  )
}

// 나의 적합도: 개념/구현 원형 2개 + 스킬 바 + 범례
function FitPanel({ job }) {
  return (
    <div style={panel}>
      <div style={panelLabel}>나의 적합도 (이 공고 기준)</div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <Circle pct={job.conceptPct} gradient={job.conceptGradient} color="var(--blue-bright)" label="개념" />
        <Circle pct={job.implPct} gradient={job.implGradient} color="var(--blue-med)" label="구현" />
      </div>
      {job.skillRows.map((s, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '68px 1fr 44px', alignItems: 'center', gap: 8, padding: '5px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>{s.name}</div>
          <div style={{ position: 'relative', height: 14, background: 'var(--track-bg)', border: '1px solid var(--border-soft)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'rgba(var(--blue-bright-rgb),0.22)', borderRight: '2px solid var(--blue-bright)', width: `${s.concept}%` }} />
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--blue-med)', opacity: 0.9, width: `${s.impl}%` }} />
          </div>
          <div style={{ fontSize: 10.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--blue-bright)' }}>{s.concept}</span>
            <span style={{ color: 'var(--text-faint)', margin: '0 1px' }}>/</span>
            <span style={{ color: 'var(--blue-med)', fontWeight: 700 }}>{s.impl}</span>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-soft)', fontSize: 10, color: 'var(--text-faint)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue-med)', flexShrink: 0 }} />구현</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(var(--blue-bright-rgb),0.22)', border: '1.5px solid var(--blue-bright)', flexShrink: 0 }} />개념</span>
      </div>
    </div>
  )
}

function Circle({ pct, gradient, color, label }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', position: 'relative', marginBottom: 8, background: gradient }}>
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color }}>
          {pct}<span style={{ fontSize: 9, fontWeight: 500 }}>%</span>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{label}</div>
    </div>
  )
}

// 갭 → 뭐부터: 순서 뱃지 + 제목/설명
function GapActions({ job }) {
  return (
    <div style={panel}>
      <div style={panelLabel}>갭 → 뭐부터</div>
      {job.gapActions.map((g, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ width: 22, height: 22, borderRadius: 10, background: g.orderBg, border: `1px solid ${g.orderBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: g.orderColor }}>{g.order}</div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{g.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{g.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 게이트 공고: 하드게이트 패널 + 3열(참고 요구역량 · 방향 정합도 · 지금 할 것)
function GateBody({ job }) {
  return (
    <div style={{ padding: '18px 20px 24px', borderTop: '1px solid var(--border-soft)' }}>
      <div style={{ display: 'flex', gap: 14, background: 'var(--panel-bg)', border: '1px solid rgba(var(--coral-rgb),0.3)', borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ fontSize: 22, flexShrink: 0 }}>🚧</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--coral)', marginBottom: 4 }}>하드 게이트 — 경력 요건 미충족</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.55, margin: 0 }}>{job.gateNote}</p>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: 'var(--coral)' }}>✕</span>{job.gateReq}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 16 }}>
        <div style={panelPad16}>
          <div style={panelLabel}>참고 요구역량</div>
          {job.requirements.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12.5, padding: '5px 0' }}>
              <span style={{ color: 'var(--text)' }}>{r.name}</span>
              <StatusPill item={r} />
            </div>
          ))}
        </div>
        <div style={panelPad16}>
          <div style={panelLabel}>참고: 방향 정합도</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{job.directionNote}</p>
        </div>
        <div style={panelPad16}>
          <div style={panelLabel}>지금 할 것</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>북극성 — 1~2년 뒤 재평가</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{job.northStarNote}</div>
        </div>
      </div>
      <div style={provenance}>{job.provenance}</div>
    </div>
  )
}
