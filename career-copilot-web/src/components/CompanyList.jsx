import { GRADES } from '../data/mockData.js'

// 등급별 개수 세기 — "강점 2 · 기본 3 …" 요약 배지에 쓴다.
function countGrades(reqs) {
  return reqs.reduce((acc, r) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1
    return acc
  }, {})
}

// CompanyList = 왼쪽 회사 목록. 클릭하면 부모의 onSelect(id) 호출(상태는 App이 소유).
export default function CompanyList({ companies, selectedId, onSelect }) {
  return (
    <aside className="list">
      <div className="list-title">지원 후보 · 적합도</div>
      {companies.map((c) => {
        const n = countGrades(c.reqs)
        const active = c.id === selectedId
        return (
          <button
            key={c.id}
            className={`co ${active ? 'co-active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="co-top">
              <span className="co-name">{c.name}</span>
              <span className={`co-fit tier-${c.tier}`}>{c.fit}%</span>
            </div>
            <div className="co-role">{c.role}</div>
            <div className="co-tag">{c.tag}</div>
            <div className="co-counts">
              {Object.entries(GRADES).map(([key, g]) =>
                n[key] ? (
                  <span key={key} className={`dot dot-${g.cls}`}>
                    {g.label} {n[key]}
                  </span>
                ) : null,
              )}
            </div>
          </button>
        )
      })}
    </aside>
  )
}
