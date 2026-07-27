import { useNavigate } from 'react-router-dom'
import { isStep4Complete } from '../components/onboarding/Step4Scale'
import { useOnboarding } from '../context/OnboardingContext'
import { useSubmitProfile } from '../hooks/useSubmitProfile'
import './CompleteScreen.css'

export default function CompleteScreen() {
  const navigate = useNavigate()
  const { profile } = useOnboarding()
  const { mutate: submitProfile, isPending, isError } = useSubmitProfile()

  const handleGoHome = () => {
    submitProfile(
      { profile, sort: 'match' },
      { onSettled: () => navigate('/home') },
    )
  }

  if (!isStep4Complete(profile.employees, profile.revenue, profile.businessYears ?? '')) {
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
        <div className="summary-row">
          <span className="label">업력</span>
          <span className="value">{profile.businessYears}</span>
        </div>
      </div>

      {isError && (
        <p className="submit-warning">저장에 실패했지만 계속 진행할게요</p>
      )}

      <button
        type="button"
        className="btn-go-home"
        onClick={handleGoHome}
        disabled={isPending}
      >
        {isPending ? '저장 중...' : '맞춤 지원금 보러가기'}
      </button>
    </div>
  )
}
