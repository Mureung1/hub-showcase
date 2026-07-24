import { useNavigate, useParams } from 'react-router-dom'
import Step1Industry, { isStep1Complete } from '../components/onboarding/Step1Industry'
import Step2Region, { isStep2Complete } from '../components/onboarding/Step2Region'
import Step3District, { isStep3Complete } from '../components/onboarding/Step3District'
import Step4Scale, { isStep4Complete } from '../components/onboarding/Step4Scale'
import ProgressBar from '../components/ProgressBar'
import { useOnboarding } from '../context/OnboardingContext'
import { STEP_META, TOTAL_STEPS } from '../data/onboardingSteps'
import './OnboardingStep.css'

export default function OnboardingStep() {
  const { step } = useParams()
  const navigate = useNavigate()
  const { profile } = useOnboarding()

  const current = Number(step)

  // 잘못된 스텝 번호는 step1로 정규화
  if (!Number.isInteger(current) || current < 1 || current > TOTAL_STEPS) {
    navigate('/onboarding/1', { replace: true })
    return null
  }

  // step3는 시·도 선택 선행 필요
  if (current === 3 && !isStep2Complete(profile.region)) {
    navigate('/onboarding/2', { replace: true })
    return null
  }

  // step4는 구·군 선택 선행 필요
  if (current === 4 && !isStep3Complete(profile.region, profile.district)) {
    navigate('/onboarding/3', { replace: true })
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

  const canProceed = (() => {
    if (current === 1) return isStep1Complete(profile.industry)
    if (current === 2) return isStep2Complete(profile.region)
    if (current === 3) return isStep3Complete(profile.region, profile.district)
    if (current === 4) {
      return isStep4Complete(profile.employees, profile.revenue, profile.businessYears ?? '')
    }
    return false
  })()

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
          {current === 3 ? (
            <>
              <span className="step-question-region">{profile.region}</span> 어디에서
              <br />
              사업하고 계세요?
            </>
          ) : (
            questionLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < questionLines.length - 1 && <br />}
              </span>
            ))
          )}
        </div>
        <div className="step-hint">{meta.hint}</div>

        <div className="step-content" data-step={current}>
          {current === 1 && <Step1Industry />}
          {current === 2 && <Step2Region />}
          {current === 3 && <Step3District />}
          {current === 4 && <Step4Scale />}
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
