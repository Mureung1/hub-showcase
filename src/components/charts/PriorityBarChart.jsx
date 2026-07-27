// improvementRanking: [{ category, label, count }] (count 내림차순 정렬은 백엔드가 이미 해서 내려줌).
// 항목 1개만 보완하면 통과하는 공고 수 기준 — 2개 이상 동시 미충족인 공고는 카운트에서 제외 (checklist_2.md 확정 사항).
// animate=false면 애니메이션 없이 최종 길이로 바로 그려진다 — DonutChart와 같은 이유(인사이트 팝업).
function PriorityBarChart({ ranking, animate = true }) {
  const maxCount = Math.max(1, ...ranking.map((r) => r.count))

  return (
    <div className="bar-chart">
      {ranking.map((r) => (
        <div className="bar-row" key={r.category}>
          <span className="bar-label">{r.label}</span>
          <div className="bar-track">
            <div
              className={`bar-fill${animate ? ' play-intro' : ''}`}
              style={{ width: `${(r.count / maxCount) * 100}%` }}
            />
          </div>
          <span className="bar-value mono">+{r.count}</span>
        </div>
      ))}
    </div>
  )
}

export default PriorityBarChart
