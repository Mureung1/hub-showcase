function DashboardSection({ requirementRows, badges, gapList }) {
  return (
    <div className="grid-2">
      <div className="card">
        <div className="section-title">
          <h2>요건별 충족률</h2>
          <span>전공 · 교양 · 총학점</span>
        </div>

        {requirementRows.map((row) => (
          <div className="req-row" key={row.name}>
            <div className="req-name">{row.name}</div>
            <div className="bar">
              <span style={{ width: `${row.pct}%` }}></span>
            </div>
            <div className="req-pct">{row.done}/{row.goal}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">
          <h2>특수 이수 인정 현황</h2>
          <span>자동 인식 항목</span>
        </div>
        <div className="badges">
          {badges.map((badge) => (
            <div 
              className={`badge ${badge.done ? 'badge-done' : ''}`}
              key={badge.label}
            >
              {badge.label}
              <b>{badge.done ? '인정됨' : '미인정'}</b>
            </div>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: '24px' }}>
          <h2>부족 요건 요약</h2>
        </div>
        <ul className="gap-list">
          {gapList.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default DashboardSection;