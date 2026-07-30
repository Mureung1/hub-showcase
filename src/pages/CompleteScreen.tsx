import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitProfile } from '../api/client'
import { isStep4Complete } from '../components/onboarding/Step4Scale'
import { useOnboarding } from '../context/OnboardingContext'
import { queryClient } from '../queryClient'
import './CompleteScreen.css'

export default function CompleteScreen() {
  const navigate = useNavigate()
  const { profile } = useOnboarding()
  const isComplete = isStep4Complete(
    profile.employees,
    profile.revenue,
    profile.businessYears ?? '',
  )

  // HomeScreen의 useSubsidies(기본 정렬 'match')와 동일한 queryKey/queryFn으로 미리
  // 채워두면, 사용자가 이 화면을 보는 유휴 시간에 조회가 끝나 /home 진입 시 중복 요청 없이
  // 캐시를 그대로 쓴다(이슈 #115). step4 미완료로 곧 리다이렉트될 때는 프리페치를 건너뛴다.
  useEffect(() => {
    if (!isComplete) return
    queryClient.prefetchInfiniteQuery({
      queryKey: ['subsidies', profile, 'match'],
      queryFn: ({ pageParam }) => submitProfile({ profile, sort: 'match', page: pageParam }),
      initialPageParam: 1,
    })
    // profile/isComplete는 이 화면에 머무는 동안 바뀌지 않으므로 마운트 시 1회만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGoHome = () => {
    navigate('/home')
  }

  if (!isComplete) {
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
          <span className="label">지원분야</span>
          <span className="value">{profile.supportRealm.join(', ')}</span>
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

      <button type="button" className="btn-go-home" onClick={handleGoHome}>
        맞춤 지원금 보러가기
      </button>
    </div>
  )
}
