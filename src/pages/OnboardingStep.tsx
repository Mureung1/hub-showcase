import { useNavigate, useParams } from 'react-router-dom'

// TODO(#11): step 1~4 입력 UI로 완성 (다음 단계)
export default function OnboardingStep() {
  const { step } = useParams()
  const navigate = useNavigate()
  const current = Number(step)

  const goNext = () => {
    if (current >= 4) navigate('/onboarding/complete')
    else navigate(`/onboarding/${current + 1}`)
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Onboarding Step {step} (placeholder)</h1>
      <button type="button" onClick={goNext}>
        다음으로
      </button>
    </div>
  )
}
