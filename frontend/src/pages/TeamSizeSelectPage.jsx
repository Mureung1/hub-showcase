import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // 이미 recruiting 상태로 소속된 팀이 있다면 그 팀의 인원수. 없으면 null(전부 선택 가능)
  const [lockedTeamSize, setLockedTeamSize] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchExistingTeam() {
      try {
        const response = await apiClient.get('/dating-teams/me')
        // teamId가 있어야 실제로 구성 중인 팀이다. null이면 아직 인원수만 골라둔 상태라 잠그지 않는다
        if (isMounted && response.data.teamId != null) {
          setLockedTeamSize(response.data.teamSize)
        }
      } catch (err) {
        console.error(err)
        // 조회 실패 시에는 안전하게 카드 3개 전부 선택 가능한 상태로 둔다
      }
    }

    fetchExistingTeam()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelect = async (teamSize) => {
    if (isSubmitting) return

    if (lockedTeamSize != null && teamSize !== lockedTeamSize) {
      setSubmitError('이미 진행 중인 팀이 있어요.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await apiClient.patch('/users/me/team-size', { teamSize })
      if (teamSize === 1) {
        navigate('/team-setup')
      } else {
        navigate('/matching/dating-same', { state: { teamSize } })
      }
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ?? '저장 중 오류가 발생했습니다. 다시 시도해주세요.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="team-size-select-page">
      <h1 className="team-size-select-title">과팅 인원을 선택해주세요</h1>

      <div className="team-size-select-card-row">
        {TEAM_SIZE_OPTIONS.map((option) => {
          const isLocked = lockedTeamSize != null && option.teamSize !== lockedTeamSize

          return (
            <button
              type="button"
              key={option.teamSize}
              className={`team-size-select-card${isLocked ? ' team-size-select-card-disabled' : ''}`}
              onClick={() => handleSelect(option.teamSize)}
              disabled={isSubmitting}
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
          )
        })}
      </div>

      {submitError && <p className="team-size-select-error">{submitError}</p>}
    </div>
  )
}
