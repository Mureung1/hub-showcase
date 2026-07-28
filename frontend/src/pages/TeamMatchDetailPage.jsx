import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import InfoModal from '../components/InfoModal'
import './TeamMatchDetailPage.css'

// 카드 아바타 색상은 실제 데이터가 아니라 순서대로 돌려쓰는 장식용 색상이다 (DatingSameResultsPage와 동일한 방식)
const AVATAR_COLORS = ['mint', 'peach', 'pink', 'blue', 'yellow']

// 취미/이상형 테스트를 아직 완료하지 않은 팀원은 hobby/dating이 null로 내려온다 — 화면이 깨지지 않도록 안내 문구로 대체
function getTypeText(typeValue) {
  return typeValue ?? '테스트 미완료'
}

// 팀원 한 명의 아바타 + 이름 + 취미/이상형 정보를 보여주는 카드
function TeamMemberCard({ member, avatarColor }) {
  return (
    <div className="team-match-detail-member">
      <div className={`team-match-detail-avatar team-match-detail-avatar-${avatarColor}`} />
      <div className="team-match-detail-name">{member.nickname}</div>
      <div className="team-match-detail-line1">
        {member.age}세 ·{' '}
        <span className="team-match-detail-hobby-text">{getTypeText(member.hobby?.primary)}</span> ·{' '}
        <span className="team-match-detail-ideal-text">{getTypeText(member.dating?.primary)}</span>
      </div>
      <div className="team-match-detail-line2">
        <span className="team-match-detail-hobby-text">{getTypeText(member.hobby?.secondary)}</span> ·{' '}
        <span className="team-match-detail-ideal-text">{getTypeText(member.dating?.secondary)}</span>
      </div>
    </div>
  )
}

export default function TeamMatchDetailPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()

  const [team, setTeam] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // 매칭 신청 버튼 클릭 -> API 호출 진행 상태
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  // 안내/성공/실패 팝업 상태. isOpen이 false면 화면에 아무것도 그리지 않는다
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' })

  useEffect(() => {
    let isMounted = true

    async function fetchTeamDetail() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await apiClient.get(`/dating-teams/${teamId}`)
        if (isMounted) {
          setTeam(response.data)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setErrorMessage('팀 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchTeamDetail()

    return () => {
      isMounted = false
    }
  }, [teamId])

  // 신청 성공/실패 이후 서버 상태와 화면 상태가 어긋났을 수 있는 경우(409 등)에 팀 상세를 조용히 다시 불러온다
  async function refetchTeamDetail() {
    try {
      const response = await apiClient.get(`/dating-teams/${teamId}`)
      setTeam(response.data)
    } catch (err) {
      console.error(err)
    }
  }

  const closeInfoModal = () => {
    setInfoModal({ isOpen: false, title: '', message: '' })
  }

  const myRequestStatus = team?.myRequestStatus ?? { hasActiveRequest: false, isForThisTeam: false }
  // 이 팀에 이미 신청을 보내 응답을 기다리는 중인지 (버튼 비활성화 조건)
  const isRequestConfirmed = myRequestStatus.hasActiveRequest && myRequestStatus.isForThisTeam
  // 다른 팀에 신청 중이라 지금은 이 팀에 새 신청을 보낼 수 없는지
  const isBlockedByOtherRequest = myRequestStatus.hasActiveRequest && !myRequestStatus.isForThisTeam

  let interestButtonLabel = '♡ 관심을 보내시겠어요?'
  if (isRequestConfirmed) {
    interestButtonLabel = '신청 완료'
  } else if (isSubmittingRequest) {
    interestButtonLabel = '신청 중...'
  }

  const handleInterestClick = async () => {
    if (!team || isSubmittingRequest || isRequestConfirmed) {
      return
    }

    // 다른 팀에 이미 신청을 보낸 상태라면 API를 호출하지 않고 바로 안내 팝업만 띄운다
    if (isBlockedByOtherRequest) {
      setInfoModal({
        isOpen: true,
        title: '안내',
        message: '이미 다른 팀에 신청을 진행 중이에요.',
      })
      return
    }

    setIsSubmittingRequest(true)
    try {
      await apiClient.post('/match-requests', { toTeamId: teamId })

      setTeam((prev) => ({
        ...prev,
        myRequestStatus: { hasActiveRequest: true, isForThisTeam: true },
      }))
      setInfoModal({
        isOpen: true,
        title: '신청 완료',
        message: '관심을 보냈어요! 상대 팀의 응답을 기다려주세요.',
      })
    } catch (err) {
      console.error(err)
      const message =
        err.response?.data?.message ?? '신청 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
      setInfoModal({ isOpen: true, title: '신청 실패', message })

      // 동시성 등으로 화면 상태와 서버 상태가 어긋났을 수 있는 409는 서버 기준으로 다시 맞춘다
      if (err.response?.status === 409) {
        refetchTeamDetail()
      }
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  return (
    <div className="team-match-detail-page">
      <button
        type="button"
        className="team-match-detail-back-link"
        onClick={() => navigate('/matching/dating-opposite')}
      >
        ← 매칭 리스트로
      </button>

      {isLoading && <p className="team-match-detail-status">팀 정보를 불러오는 중이에요...</p>}

      {!isLoading && errorMessage && (
        <p className="team-match-detail-status team-match-detail-status-error">{errorMessage}</p>
      )}

      {!isLoading && !errorMessage && team && (
        <>
          <h1 className="team-match-detail-title">{team.teamName} 팀과의 궁합</h1>

          <div className="team-match-detail-member-row">
            {team.members.map((member, index) => (
              <TeamMemberCard
                key={member.userId}
                member={member}
                avatarColor={AVATAR_COLORS[index % AVATAR_COLORS.length]}
              />
            ))}
          </div>

          <div className="team-match-detail-percent">
            {team.matchPercent != null ? `취향 궁합 ${team.matchPercent}%` : '궁합 정보를 표시할 수 없어요'}
          </div>

          <button
            type="button"
            className="team-match-detail-interest-button"
            onClick={handleInterestClick}
            disabled={isRequestConfirmed || isSubmittingRequest}
          >
            {interestButtonLabel}
          </button>
        </>
      )}

      <InfoModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        onConfirm={closeInfoModal}
      />
    </div>
  )
}
