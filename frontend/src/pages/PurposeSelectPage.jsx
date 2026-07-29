import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import NotificationBell from '../components/NotificationBell'
import ChatListButton from '../components/ChatListButton'
import datingIllustration from '../assets/illustrations/onboarding-dating.png'
import roommateIllustration from '../assets/illustrations/onboarding-roommate.png'
import './PurposeSelectPage.css'

export default function PurposeSelectPage() {
  const navigate = useNavigate()

  // 테스트 완료 여부 조회 중에는 룸메 버튼을 눌러도 분기하지 않도록 로딩 상태를 따로 둔다
  const [testStatus, setTestStatus] = useState(null)
  const [isStatusLoading, setIsStatusLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    apiClient
      .get('/tests/status')
      .then((res) => {
        if (isMounted) setTestStatus(res.data)
      })
      .catch(() => {
        // 조회 실패 시 testStatus는 null로 두고, 클릭 시 기존 동작(테스트 화면 이동)으로 폴백한다
      })
      .finally(() => {
        if (isMounted) setIsStatusLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleMypageClick = () => {
    console.log('마이페이지 이동 예정')
  }

  const handleRoommateClick = () => {
    if (isStatusLoading) return

    if (testStatus?.hasCompletedLifestyleTest) {
      navigate('/select-roommate-type')
    } else {
      navigate('/test/lifestyle')
    }
  }

  const handleDatingClick = () => {
    if (isStatusLoading) return

    if (testStatus?.hasCompletedDatingTest) {
      navigate('/select-team-size')
    } else {
      navigate('/test/dating')
    }
  }

  return (
    <div className="purpose-select-page">
      <div className="purpose-select-top-row">
        <ChatListButton />
        <NotificationBell />
        <button type="button" className="purpose-select-mypage-button" onClick={handleMypageClick}>
          마이페이지
        </button>
      </div>

      <h1 className="purpose-select-title">어떤 '우리'가 필요하신가요?</h1>

      <div className="purpose-select-card-row">
        <button
          type="button"
          className="purpose-select-card purpose-select-card-dating"
          onClick={handleDatingClick}
          disabled={isStatusLoading}
        >
          <img src={datingIllustration} alt="과팅" className="purpose-select-card-image" />
          <div className="purpose-select-card-title">과팅</div>
          <div className="purpose-select-card-sub">함께 나갈 팀 찾기</div>
        </button>

        <button
          type="button"
          className="purpose-select-card purpose-select-card-roommate"
          onClick={handleRoommateClick}
          disabled={isStatusLoading}
        >
          <img src={roommateIllustration} alt="룸메이트" className="purpose-select-card-image" />
          <div className="purpose-select-card-title">룸메이트</div>
          <div className="purpose-select-card-sub">생활 성향 맞는 룸메</div>
        </button>
      </div>
    </div>
  )
}
