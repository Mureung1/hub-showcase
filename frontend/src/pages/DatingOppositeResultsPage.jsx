import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import NotificationBell from '../components/NotificationBell'
import './DatingOppositeResultsPage.css'

// finalScore(0~1)를 반올림한 궁합 % 라벨로 변환한다
function getMatchPercentLabel(finalScore) {
  if (typeof finalScore !== 'number' || Number.isNaN(finalScore)) {
    return '-%'
  }
  return `${Math.round(finalScore * 100)}%`
}

// dating_teams에는 아직 팀 이름 필드가 없어서, 리더 닉네임 기반으로 이름을 만든다.
// leaderNickname을 못 받아온 경우(탈퇴한 유저 등)는 기존처럼 teamId 기반 임시 이름으로 대체한다
function getTeamDisplayName(match) {
  if (match.leaderNickname) {
    return `${match.leaderNickname} 팀`
  }
  return `${match.teamId}팀`
}

export default function DatingOppositeResultsPage() {
  const navigate = useNavigate()
  const [teamSize, setTeamSize] = useState(null)
  const [matches, setMatches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchOppositeMatches() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const myTeamResponse = await apiClient.get('/dating-teams/me')
        const myTeamId = myTeamResponse.data.teamId

        // 아직 팀이 만들어지지 않은 유저(teamId 없음)는 매칭 후보를 조회할 수 없다
        if (!myTeamId) {
          if (isMounted) {
            setErrorMessage('아직 팀이 구성되지 않았어요. 팀을 먼저 만들어주세요.')
          }
          return
        }

        if (isMounted) {
          setTeamSize(myTeamResponse.data.teamSize)
        }

        const matchesResponse = await apiClient.get(`/dating-teams/${myTeamId}/opposite-matches`)
        if (isMounted) {
          setMatches(matchesResponse.data ?? [])
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setErrorMessage('매칭 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchOppositeMatches()

    return () => {
      isMounted = false
    }
  }, [])

  const handleDetailClick = (teamId) => {
    navigate(`/matching/dating-opposite/${teamId}`)
  }

  return (
    <div className="dating-opposite-results-page">
      <div className="dating-opposite-results-notification-bell">
        <NotificationBell />
      </div>

      <span className="dating-opposite-results-eyebrow">매칭 결과</span>
      <h1 className="dating-opposite-results-title">
        이성그룹 매칭{teamSize != null ? ` ${teamSize}:${teamSize}` : ''}
      </h1>
      <p className="dating-opposite-results-subtitle">우리 팀과 어울리는 상대 팀을 찾았어요!</p>

      {isLoading && (
        <p className="dating-opposite-results-status">매칭 결과를 불러오는 중이에요...</p>
      )}

      {!isLoading && errorMessage && (
        <p className="dating-opposite-results-status dating-opposite-results-status-error">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && matches.length === 0 && (
        <p className="dating-opposite-results-status">아직 매칭 가능한 팀이 없어요.</p>
      )}

      {!isLoading && !errorMessage && matches.length > 0 && (
        <div className="dating-opposite-results-list">
          {matches.map((match) => (
            <div className="dating-opposite-results-card" key={match.teamId}>
              <div className="dating-opposite-results-avatar" />

              <div className="dating-opposite-results-info">
                <div className="dating-opposite-results-name">
                  {getTeamDisplayName(match)}
                </div>
                <div className="dating-opposite-results-percent">
                  취향 궁합 {getMatchPercentLabel(match.finalScore)}
                </div>
              </div>

              <button
                type="button"
                className="dating-opposite-results-detail-button"
                onClick={() => handleDetailClick(match.teamId)}
              >
                자세히보기
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
