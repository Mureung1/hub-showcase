// 4가지 분기 (docs/plan_3.md, prototype/demo_11.html의 renderInsightModal 참고):
// 1) 대상 공고 0건, 2) 이미 전부 충족, 3) 항목 1개만 보완하면 늘어나는 공고 있음, 4) 여러 항목을 함께 보완해야 함.
// hasTip=false가 곧바로 "이미 다 갖췄다"는 아니다 — 항목 1개만 미충족인 공고만 improvementRanking에 카운트되고
// 2개 이상 동시 미충족인 공고는 제외되므로, hasTip=false여도 matchRate가 100%가 아닐 수 있다.
// 그래서 "다 갖췄다"는 반드시 matched===total로만 판단하고, hasTip=false는 별도의 "복합 미충족" 상태로 분리한다.
function InsightModal({ stats, onClose }) {
  const topTip = stats.improvementRanking[0]
  const noJobs = stats.total === 0
  const hasTip = Boolean(topTip && topTip.count > 0)
  const allMatched = !noJobs && stats.matched === stats.total
  const matchRate = stats.total === 0 ? 0 : Math.round(stats.ratio * 100)

  const emoji = noJobs ? '💪' : allMatched ? '🎉' : hasTip ? '😊' : '🧩'
  const title = noJobs
    ? '지금 조건엔 맞는 공고가 없어요'
    : allMatched
      ? '이미 모든 항목을 꽉 채우고 있어요!'
      : hasTip
        ? (
            <>
              <b>{topTip.label}</b>만 채우면 지원 가능한 공고가 <b>+{topTip.count}건</b> 더 늘어나요!
            </>
          )
        : '여러 항목을 함께 보완해야 하는 공고가 있어요'
  const sub = noJobs
    ? '조건을 조금 넓히거나 스펙을 하나씩 더 채워보면 새로운 기회가 열릴 거예요. 조금만 더 힘내봐요!'
    : allMatched
      ? `지금 스펙이면 지원 가능 공고 비율이 ${matchRate}%예요. 정말 잘 준비했어요.`
      : hasTip
        ? `졸업 전에 ${topTip.label}부터 준비해두면 선택지가 훨씬 넓어질 거예요.`
        : '항목 하나만 바꿔서 새로 열리는 공고는 없지만, 아래 목록에서 공고별로 어떤 항목들이 함께 부족한지 확인해보세요.'
  const btnLabel = noJobs ? '확인하기' : '결과 자세히 보기'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box insight-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="insight-modal-emoji">{emoji}</div>
        <p className="insight-modal-title">{title}</p>
        <p className="insight-modal-sub">{sub}</p>
        <button className="btn-primary insight-modal-btn" onClick={onClose}>
          {btnLabel}
        </button>
      </div>
    </div>
  )
}

export default InsightModal
