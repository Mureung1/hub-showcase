import { useNavigate, useParams } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { STEP_META, TOTAL_STEPS } from '../data/onboardingSteps'
import './OnboardingStep.css'

export default function OnboardingStep() {
  const { step } = useParams()
  const navigate = useNavigate()

  const current = Number(step)

  // 잘못된 스텝 번호는 step1로 정규화
  if (!Number.isInteger(current) || current < 1 || current > TOTAL_STEPS) {
    navigate('/onboarding/1', { replace: true })
    return null
  }

  const meta = STEP_META[current]
  const questionLines = meta.question.split('\n')

  const goBack = () => {
    if (current === 1) navigate('/')
    else navigate(`/onboarding/${current - 1}`)
  }

  const goNext = () => {
    if (current >= TOTAL_STEPS) navigate('/onboarding/complete')
    else navigate(`/onboarding/${current + 1}`)
  }

  // 스텝별 입력 완료 여부 — 2c~2f에서 세분화
  const canProceed = false

  const nextLabel = current === TOTAL_STEPS ? '맞춤 지원금 찾기' : '다음으로'

  return (
    <div className="onboarding screen active">
      <ProgressBar current={current} total={TOTAL_STEPS} />

      <div className="step-nav">
        <button type="button" className="btn-back" onClick={goBack}>
          ← 이전
        </button>
        <span className="step-num">
          {current} / {TOTAL_STEPS}
        </span>
      </div>

      <div className="step-body">
        <div className="step-question">
          {questionLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < questionLines.length - 1 && <br />}
            </span>
          ))}
        </div>
        <div className="step-hint">{meta.hint}</div>

        {/* 스텝별 입력 UI — 2c~2f에서 구현 */}
        <div className="step-content" data-step={current}>
          <p className="step-placeholder">(step {current} 입력 UI 준비 중)</p>
        </div>
      </div>

      <div className="step-bottom">
        <button
          type="button"
          className="btn-next"
          disabled={!canProceed}
          onClick={goNext}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}
