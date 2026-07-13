import { useNavigate } from 'react-router-dom'
import { isStep4Complete } from '../components/onboarding/Step4Scale'
import { useOnboarding } from '../context/OnboardingContext'
import './CompleteScreen.css'

export default function CompleteScreen() {
  const navigate = useNavigate()
  const { profile } = useOnboarding()

  if (!isStep4Complete(profile.employees, profile.revenue)) {
    navigate('/onboarding/1', { replace: true })
    return null
  }

  const regionLabel =
    profile.region && profile.district
      ? `${profile.region} ${profile.district}`
      : profile.region || '—'

  return (
    <div className="complete screen active">
      <div className="complete-check">✓</div>
      <h2>준비 완료!</h2>
      <p>
        입력하신 정보로
        <br />
        맞춤 지원금을 찾았어요
      </p>

      <div className="summary-box">
        <div className="summary-row">
          <span className="label">업종</span>
          <span className="value">{profile.industry}</span>
        </div>
        <div className="summary-row">
          <span className="label">지역</span>
          <span className="value">{regionLabel}</span>
        </div>
        <div className="summary-row">
          <span className="label">직원 수</span>
          <span className="value">{profile.employees}</span>
        </div>
        <div className="summary-row">
          <span className="label">연매출</span>
          <span className="value">{profile.revenue}</span>
        </div>
      </div>

      <button
        type="button"
        className="btn-go-home"
        onClick={() => navigate('/home')}
      >
        맞춤 지원금 보러가기
      </button>
    </div>
  )
}
