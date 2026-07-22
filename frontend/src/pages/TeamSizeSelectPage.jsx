import { useNavigate } from 'react-router-dom'
import './TeamSizeSelectPage.css'

// DESIGN.md 8.1 아이콘 규칙(viewBox 0 0 64 64, stroke 4, 플랫, 팔레트 컬러) 기준으로 그린 사람/하트 아이콘
function PersonIcon() {
  return (
    <svg viewBox="0 0 64 64" className="team-size-select-icon">
      <circle cx="32" cy="20" r="10" fill="#F0B79C" stroke="#4A2E22" strokeWidth="4" />
      <path
        d="M14 54c0-12 8-18 18-18s18 6 18 18"
        fill="#F0B79C"
        stroke="#4A2E22"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 64 64" className="team-size-select-icon team-size-select-icon-heart">
      <path
        d="M32 54C14 42 6 30 6 19 6 10 13 4 21 4c5 0 9 3 11 7 2-4 6-7 11-7 8 0 15 6 15 15 0 11-8 23-26 35z"
        fill="#E85D5D"
        stroke="#4A2E22"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const TEAM_SIZE_OPTIONS = [
  { teamSize: 1, ratio: '1:1', description: '두근두근한 분위기를 원한다면?' },
  { teamSize: 2, ratio: '2:2', description: '부담없이 즐기고 싶다면?' },
  { teamSize: 3, ratio: '3:3', description: '왁자지껄하게 즐기고 싶다면?' },
]

export default function TeamSizeSelectPage() {
  const navigate = useNavigate()

  const handleSelect = (teamSize) => {
    navigate('/matching/dating-same', { state: { teamSize } })
  }

  return (
    <div className="team-size-select-page">
      <h1 className="team-size-select-title">과팅 인원을 선택해주세요</h1>

      <div className="team-size-select-card-row">
        {TEAM_SIZE_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.teamSize}
            className="team-size-select-card"
            onClick={() => handleSelect(option.teamSize)}
          >
            <div className="team-size-select-icon-row">
              {Array.from({ length: option.teamSize }).map((_, i) => (
                <PersonIcon key={`left-${i}`} />
              ))}
              <HeartIcon />
              {Array.from({ length: option.teamSize }).map((_, i) => (
                <PersonIcon key={`right-${i}`} />
              ))}
            </div>
            <div className="team-size-select-ratio">{option.ratio}</div>
            <div className="team-size-select-desc">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
