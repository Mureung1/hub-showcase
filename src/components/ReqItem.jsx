import { STATUS_LABEL } from '../data/mockData.js'

// data 안의 <b> 같은 인라인 태그를 그대로 렌더하기 위한 헬퍼
const H = ({ html }) => <span dangerouslySetInnerHTML={{ __html: html }} />

// 요구역량 한 줄 — 클릭하면 근거 펼침. 원본 v2 의 details.req-item 구조 그대로.
export default function ReqItem({ req }) {
  const isGap = req.status === 'st-gap'
  const isWeak = req.status === 'st-weak'
  const cls = `req-item${isGap ? ' is-gap' : ''}${isWeak ? ' is-weak' : ''}`

  return (
    <details className={cls}>
      <summary className="req-head">
        <span className="req-name">{req.name}</span>
        <span className={`req-status ${req.status}`}>
          <span className="rs-dot"></span>
          {STATUS_LABEL[req.status]}
        </span>
        <span className="req-chev">▾</span>
      </summary>

      <div className="req-ev">
        {req.rich ? <RichEvidence ev={req.rich} /> : <SimpleEvidence req={req} />}
      </div>
    </details>
  )
}

// 단순 근거: 한 문단 + 태그 + 액션
function SimpleEvidence({ req }) {
  return (
    <>
      <p className="req-why"><H html={req.why} /></p>
      {req.tags && (
        <div className="req-ev-tags">
          {req.tags.map((t, i) => <span key={i} className={`ev-tag ${t.cls}`}>{t.text}</span>)}
        </div>
      )}
      {req.action && <Action action={req.action} />}
    </>
  )
}

// 상세 근거: 프로젝트 + 스코프 + 직접vsAI 바 (정직 레이어의 핵심)
function RichEvidence({ ev }) {
  return (
    <>
      <div className="ev-proj">
        <span className="ev-proj-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></svg>
        </span>
        <div>
          <span className="ev-proj-name">{ev.proj.name}</span>
          <span className="ev-proj-meta">{ev.proj.meta}</span>
        </div>
      </div>

      <div className="ev-section">
        <div className="ev-sec-label">무엇을 구현했나</div>
        <ul className="ev-ul">
          {ev.built.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>

      <div className="ev-section">
        <div className="ev-sec-label">얼마나 (스코프)</div>
        <div className="ev-metrics">
          {ev.metrics.map((m, i) => <span key={i} className="ev-metric"><H html={m} /></span>)}
        </div>
      </div>

      <div className="ev-section">
        <div className="ev-sec-label">
          직접 vs AI 관여<span className="ev-est">실측 · Co-Authored 서명 스캔</span>
        </div>
        <div className="ev-ai-bar">
          <div className="ev-ai-assist" style={{ width: `${ev.ai.assist}%` }}>{ev.ai.assistLabel}</div>
          <div className="ev-ai-self" style={{ width: `${ev.ai.self}%` }}>{ev.ai.selfLabel}</div>
        </div>
        <div className="ev-ai-basis">
          <span className="ev-ai-basis-label">실측</span><H html={ev.ai.basis} />
        </div>
        <p className="ev-ai-note"><H html={ev.ai.note} /></p>
      </div>

      <div className="ev-links">
        {ev.links.map((l, i) => <span key={i} className={`ev-tag ${l.cls}`}>{l.text}</span>)}
      </div>

      {ev.action && <Action action={ev.action} />}
      {ev.unconfirmed && <div className="ev-unconfirmed">{ev.unconfirmed}</div>}
    </>
  )
}

function Action({ action }) {
  return (
    <div className={`ev-action${action.gap ? ' gap-action' : ''}`}>
      <span className="ea-label">{action.label}</span>
      <span>{action.text}</span>
    </div>
  )
}
