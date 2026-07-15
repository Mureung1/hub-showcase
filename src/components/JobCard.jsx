import { STATUS_LABEL } from '../data/mockData.js'
import ReqItem from './ReqItem.jsx'

// 공고 카드 하나 = <details> (원본 v2 구조). 펼치면 3단 상세 그리드.
export default function JobCard({ job, defaultOpen }) {
  return (
    <details className={`job-card panel tier-${job.tier}`} open={defaultOpen}>
      <summary>
        <div className="job-summary-row">
          <div className="tier-badge"></div>
          <div className="job-id">
            <div className="job-id-top">
              <span className="job-company">{job.company}</span>
              <span className="job-role">{job.role}</span>
              {job.isNew && <span className="new-tag">NEW</span>}
            </div>
            <div className="job-meta-row">
              <span className="job-source">{job.source}</span>
            </div>
          </div>
          <div className="job-fit-col">
            <div className="job-fit-num">적합도 <b>{job.fit}</b></div>
            <div className="job-gap-note">{job.gapNote}</div>
          </div>
          <div className="job-deadline-col">
            <span className="deadline-tag">{job.deadlineTag}</span>
            <span className="deadline-sub">{job.deadlineSub} <span className="expand-chevron">▾</span></span>
          </div>
        </div>
      </summary>

      <div className="job-detail">
        <div className="job-detail-grid">
          <ReqBlock job={job} />
          <FitBlock job={job} />
          <GapBlock job={job} />
        </div>

        <div className="provenance">
          {job.provenance.map((p, i) => (
            <span key={i}>
              <span>{p}</span>
              {i < job.provenance.length - 1 && <span className="sep"> · </span>}
            </span>
          ))}
          <span className="sep"> · </span>
          <span className={job.confidence === 'high' ? 'confidence-high' : 'confidence-mid'}>
            {job.confidenceLabel}
          </span>
        </div>
      </div>
    </details>
  )
}

// ① 요구 역량
function ReqBlock({ job }) {
  return (
    <div className="detail-block">
      <div className="detail-block-title"><span className="n">1</span>이 공고가 요구하는 역량</div>
      <div className="req-list">
        <div className="req-legend">
          <span className="lg st-strong"><span className="rs-dot"></span>강점</span>
          <span className="lg st-ok"><span className="rs-dot"></span>기본</span>
          <span className="lg st-weak"><span className="rs-dot"></span>근거부족</span>
          <span className="lg st-gap"><span className="rs-dot"></span>미보유</span>
        </div>
        <div className="req-hint">클릭 → 근거·스코프·직접vsAI·강해지는 액션. 근거 없으면 '충족'이라 안 적음.</div>
        {job.reqGroups.map((g, gi) => (
          <div key={gi}>
            <div className="req-group-label">{g.label}</div>
            {g.items.map((req, i) => <ReqItem key={i} req={req} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ② 개념/구현 도넛 + 스킬바
function FitBlock({ job }) {
  return (
    <div className="detail-block">
      <div className="detail-block-title"><span className="n">2</span>나의 적합도 (이 공고 기준)</div>
      <div className="fit-mini-row">
        <Donut axis="concept" value={job.concept} label="개념" />
        <Donut axis="impl" value={job.impl} label="구현" />
      </div>
      {job.skills.map((s, i) => (
        <div className="mini-skill-row" key={i}>
          <div className="mini-skill-name">{s.name}</div>
          <div className="mini-skill-track">
            <div className="mini-skill-bar concept-bar" style={{ width: `${s.concept}%` }}></div>
            <div className="mini-skill-bar impl-bar" style={{ width: `${s.impl}%` }}></div>
          </div>
          <div className="mini-skill-nums">
            <span className="n-c">{s.concept}</span><span className="n-s">/</span><span className="n-i">{s.impl}</span>
          </div>
        </div>
      ))}
      <div className="mini-legend">
        <span className="item"><span className="mini-legend-swatch impl-sw"></span>구현</span>
        <span className="item"><span className="mini-legend-swatch concept-sw"></span>개념</span>
      </div>
    </div>
  )
}

function Donut({ axis, value, label }) {
  const color = axis === 'concept' ? 'var(--concept)' : 'var(--impl)'
  return (
    <div className={`fit-mini ${axis}`}>
      <div className="donut-mini" style={{ background: `conic-gradient(${color} 0% ${value}%, var(--border-soft) ${value}% 100%)` }}>
        <div className="donut-mini-value">{value}<sup>%</sup></div>
      </div>
      <div className="fit-mini-label">{label}</div>
    </div>
  )
}

// ③ 갭 → 뭐부터
function GapBlock({ job }) {
  return (
    <div className="detail-block">
      <div className="detail-block-title"><span className="n">3</span>갭 → 뭐부터</div>
      <div className="mini-action-list">
        {job.gapActions.map((a, i) => (
          <div className={`mini-action-item${a.locked ? ' locked' : ''}`} key={i}>
            <div className="mini-action-order">{a.order}</div>
            <div>
              <div className="mini-action-title">{a.title}</div>
              <div className="mini-action-desc">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
