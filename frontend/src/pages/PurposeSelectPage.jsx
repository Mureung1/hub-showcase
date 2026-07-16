import { useNavigate } from 'react-router-dom'
import datingIllustration from '../assets/illustrations/onboarding-dating.png'
import roommateIllustration from '../assets/illustrations/onboarding-roommate.png'
import './PurposeSelectPage.css'

export default function PurposeSelectPage() {
  const navigate = useNavigate()

  const handleMypageClick = () => {
    console.log('마이페이지 이동 예정')
  }

  return (
    <div className="purpose-select-page">
      <div className="purpose-select-top-row">
        <button type="button" className="purpose-select-mypage-button" onClick={handleMypageClick}>
          마이페이지
        </button>
      </div>

      <h1 className="purpose-select-title">어떤 '우리'가 필요하신가요?</h1>

      <div className="purpose-select-card-row">
        <button
          type="button"
          className="purpose-select-card purpose-select-card-dating"
          onClick={() => navigate('/test/dating')}
        >
          <img src={datingIllustration} alt="과팅" className="purpose-select-card-image" />
          <div className="purpose-select-card-title">과팅</div>
          <div className="purpose-select-card-sub">함께 나갈 팀 찾기</div>
        </button>

        <button
          type="button"
          className="purpose-select-card purpose-select-card-roommate"
          onClick={() => navigate('/test/lifestyle')}
        >
          <img src={roommateIllustration} alt="룸메이트" className="purpose-select-card-image" />
          <div className="purpose-select-card-title">룸메이트</div>
          <div className="purpose-select-card-sub">생활 성향 맞는 룸메</div>
        </button>
      </div>
    </div>
  )
}
