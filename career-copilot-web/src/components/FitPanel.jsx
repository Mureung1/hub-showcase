import RequirementItem from './RequirementItem.jsx'

// FitPanel = 선택된 회사의 상세 채점. company를 props로 받아 그린다.
export default function FitPanel({ company }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{company.name}</h2>
          <div className="panel-role">{company.role}</div>
        </div>
        <div className={`ring tier-${company.tier}`}>
          <span className="ring-num">{company.fit}</span>
          <span className="ring-unit">%</span>
        </div>
      </div>

      <p className="headline">{company.headline}</p>

      <div className="reqs">
        <div className="reqs-title">요구사항 × 내 근거 (클릭해서 근거 보기)</div>
        {company.reqs.map((r, i) => (
          <RequirementItem key={i} req={r} />
        ))}
      </div>
    </section>
  )
}
