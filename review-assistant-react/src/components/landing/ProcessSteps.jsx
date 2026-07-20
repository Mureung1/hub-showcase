import { useInView } from '../../hooks/useInView.js'

const PROCESS_STEPS = [
  { num: 1, label: '리뷰 접수' },
  { num: 2, label: '감정 분석' },
  { num: 3, label: '답변 초안' },
]

function ProcessSteps() {
  const [processRef, processInView] = useInView()

  return (
    <section
      ref={processRef}
      className={`lp-process scroll-reveal ${processInView ? 'in-view' : ''}`}
    >
      <h2 className="section-title">리뷰가 쌓이면, 이런 흐름으로 정리돼요</h2>
      <p className="section-sub">최대 15개 리뷰를 한 번에 분석하고, 답변 초안까지 만들어드려요</p>

      <div className="lp-process-row">
        <div className="lp-process-line" />
        <div className="lp-process-dot" />
        {PROCESS_STEPS.map((step) => (
          <div className="lp-process-step" key={step.num}>
            <div className="lp-process-num">{step.num}</div>
            <div className="lp-process-label">{step.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ProcessSteps
