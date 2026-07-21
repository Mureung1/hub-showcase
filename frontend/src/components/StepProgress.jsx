import './StepProgress.css'

// 단계 진행 인디케이터. gold는 현재/완료 단계에만(디자인 규칙: 성취 모티프).
// total: 전체 단계 수, current: 현재 인덱스(0-base).
function StepProgress({ total, current, labels }) {
  return (
    <div
      className="rs-steps"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`${total}단계 중 ${current + 1}단계`}
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i < current ? 'is-done' : i === current ? 'is-current' : ''
        return (
          <div key={i} className={`rs-step ${state}`}>
            <span className="rs-step-dot">{i < current ? '✓' : i + 1}</span>
            {labels?.[i] && <span className="rs-step-label">{labels[i]}</span>}
          </div>
        )
      })}
    </div>
  )
}

export default StepProgress
