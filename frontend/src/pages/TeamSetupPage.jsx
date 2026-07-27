import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import NotificationBell from '../components/NotificationBell'
import InviteCodeModal from '../components/InviteCodeModal'
import './TeamSetupPage.css'

// 팀원이 초대를 수락하면 화면에 자동 반영되도록 일정 주기로 팀 현황을 다시 조회한다.
// 재사용 가능한 폴링 유틸이 아직 프로젝트에 없어 이 화면에서만 간단히 setInterval로 구현했다.
const POLL_INTERVAL_MS = 5000

// "나" 슬롯은 항상 peach, 이후 합류하는 팀원은 순서대로 이 컬러를 돌려쓴다
const SLOT_COLORS = ['peach', 'mint', 'pink', 'blue', 'yellow']

export default function TeamSetupPage() {
  const navigate = useNavigate()
  const [teamSize, setTeamSize] = useState(null)
  const [members, setMembers] = useState([])
  const [myUserId, setMyUserId] = useState(null)
  const [teamId, setTeamId] = useState(null)
  const [teamStatus, setTeamStatus] = useState(null)
  const [isLeader, setIsLeader] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState('')

  const [isConfirmingTeam, setIsConfirmingTeam] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  const successTimeoutRef = useRef(null)
  // 팀이 확정된 순간(리더가 방금 확정했든, 팔로워가 폴링으로 뒤늦게 알았든, 재진입 시
  // 이미 확정돼 있었든) 딱 한 번만 다음 화면으로 이동시키기 위한 가드
  const hasNavigatedRef = useRef(false)

  const fetchTeamStatus = useCallback(async (showLoading) => {
    if (showLoading) {
      setIsLoading(true)
    }

    try {
      const response = await apiClient.get('/dating-teams/me')
      setTeamSize(response.data.teamSize)
      setMembers(response.data.members ?? [])
      setMyUserId(response.data.myUserId)
      setTeamId(response.data.teamId)
      setTeamStatus(response.data.status)
      setIsLeader(Boolean(response.data.isLeader))
      setLoadError('')
    } catch (err) {
      console.error(err)
      setLoadError('팀 현황을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchTeamStatus(true)

    const intervalId = setInterval(() => {
      fetchTeamStatus(false)
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [fetchTeamStatus])

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  // status가 'matched'가 되면(리더 직접 확정 / 팔로워 폴링 감지 / 재진입 시 이미 확정된 팀
  // 모두 포함) 안내 문구를 잠깐 보여준 뒤 이성그룹 매칭 결과 화면으로 이동한다.
  useEffect(() => {
    if (teamStatus !== 'matched' || hasNavigatedRef.current) {
      return
    }
    hasNavigatedRef.current = true

    const timeoutId = setTimeout(() => {
      navigate('/matching/dating-opposite')
    }, 1500)

    return () => clearTimeout(timeoutId)
  }, [teamStatus, navigate])

  const otherMembers = members.filter((member) => member.userId !== myUserId)
  const myMember = members.find((member) => member.userId === myUserId)
  const filledCount = myMember ? 1 + otherMembers.length : 0
  const emptySlotCount = teamSize != null ? Math.max(teamSize - filledCount, 0) : 0
  const isTeamFull = teamSize != null && filledCount >= teamSize

  const openInviteModal = () => {
    setInviteError('')
    setIsModalOpen(true)
  }

  const closeInviteModal = () => {
    if (isSendingInvite) {
      return
    }
    setIsModalOpen(false)
  }

  const handleSubmitInvite = async (code) => {
    setIsSendingInvite(true)
    setInviteError('')

    try {
      await apiClient.post('/team-invites', { inviteCode: code })
      setIsModalOpen(false)
      setInviteSuccessMessage('초대를 보냈어요!')
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
      successTimeoutRef.current = setTimeout(() => setInviteSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setInviteError(
        err.response?.data?.message ?? '초대를 보내지 못했어요. 잠시 후 다시 시도해주세요.',
      )
    } finally {
      setIsSendingInvite(false)
    }
  }

  const handleConfirmTeam = async () => {
    if (!teamId && teamSize !== 1) {
      return
    }

    setIsConfirmingTeam(true)
    setConfirmError('')

    try {
      if (teamId) {
        await apiClient.patch(`/dating-teams/${teamId}/confirm`)
      } else {
        const response = await apiClient.post('/dating-teams/solo-confirm')
        setTeamId(response.data.teamId)
      }
      setTeamStatus('matched')
    } catch (err) {
      console.error(err)
      setConfirmError(
        err.response?.data?.message ?? '팀 확정에 실패했어요. 잠시 후 다시 시도해주세요.',
      )
    } finally {
      setIsConfirmingTeam(false)
    }
  }

  return (
    <div className="team-setup-page">
      <div className="team-setup-notification-bell">
        <NotificationBell />
      </div>

      <h1 className="team-setup-title">
        팀 구성{teamSize != null ? ` ${teamSize}:${teamSize}` : ''}
      </h1>
      <p className="team-setup-subtitle">함께 나갈 팀을 만들어볼까요?</p>

      {isLoading && <p className="team-setup-status">팀 현황을 불러오는 중이에요...</p>}

      {!isLoading && loadError && (
        <p className="team-setup-status team-setup-status-error">{loadError}</p>
      )}

      {!isLoading && !loadError && teamStatus === 'matched' && (
        <p className="team-setup-status">
          ✓ 팀이 확정됐어요! 상대팀 매칭 결과로 이동할게요...
        </p>
      )}

      {!isLoading && !loadError && teamSize != null && teamStatus !== 'matched' && (
        <>
          <div className="team-setup-slot-row">
            <div className="team-setup-slot">
              <div
                className={`team-setup-slot-circle team-setup-slot-filled team-setup-slot-${SLOT_COLORS[0]}`}
              />
              <div className="team-setup-slot-label">나</div>
            </div>

            {otherMembers.map((member, index) => (
              <div className="team-setup-slot" key={member.userId}>
                <div
                  className={`team-setup-slot-circle team-setup-slot-filled team-setup-slot-${SLOT_COLORS[(index + 1) % SLOT_COLORS.length]}`}
                />
                <div className="team-setup-slot-label">{member.nickname}</div>
              </div>
            ))}

            {Array.from({ length: emptySlotCount }).map((_, index) => (
              <div className="team-setup-slot" key={`invite-slot-${index}`}>
                <button
                  type="button"
                  className="team-setup-slot-circle team-setup-slot-empty"
                  onClick={openInviteModal}
                  aria-label="초대하기"
                >
                  +
                </button>
                <div className="team-setup-slot-label">초대하기</div>
              </div>
            ))}
          </div>

          {inviteSuccessMessage && (
            <p className="team-setup-invite-success">{inviteSuccessMessage}</p>
          )}

          <div className="team-setup-bottom-actions">
            <button
              type="button"
              className="team-setup-confirm-button"
              disabled={
                !isTeamFull ||
                !isLeader ||
                (!teamId && teamSize !== 1) ||
                isConfirmingTeam
              }
              onClick={handleConfirmTeam}
            >
              {isConfirmingTeam ? '확정 중...' : '팀 확정'}
            </button>

            {isTeamFull && !isLeader && (
              <p className="team-setup-leader-hint">리더만 팀을 확정할 수 있어요</p>
            )}

            {confirmError && (
              <p className="team-setup-confirm-error">{confirmError}</p>
            )}

            {!isTeamFull && (
              <button type="button" className="team-setup-invite-link" onClick={openInviteModal}>
                친구 코드로 초대하기
              </button>
            )}
          </div>
        </>
      )}

      <InviteCodeModal
        isOpen={isModalOpen}
        onClose={closeInviteModal}
        onSubmit={handleSubmitInvite}
        isSubmitting={isSendingInvite}
        errorMessage={inviteError}
      />
    </div>
  )
}
