import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import InfoModal from './InfoModal'
import './NotificationBell.css'

// 독립적인 알림 벨 컴포넌트. 화면별 특수 로직 없이 어디든 그대로 끼워 넣을 수 있다.
export default function NotificationBell() {
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const [summary, setSummary] = useState({
    totalCount: 0,
    unreadChats: [],
    pendingInvites: [],
    pendingMatchRequests: [],
  })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isChatsExpanded, setIsChatsExpanded] = useState(false)
  const [isInvitesExpanded, setIsInvitesExpanded] = useState(false)
  const [isMatchRequestsExpanded, setIsMatchRequestsExpanded] = useState(false)
  const [respondingInviteId, setRespondingInviteId] = useState(null)
  const [inviteErrorMessage, setInviteErrorMessage] = useState('')
  const [respondingMatchRequestId, setRespondingMatchRequestId] = useState(null)
  const [matchRequestErrorMessage, setMatchRequestErrorMessage] = useState('')
  // 매칭 신청 수락/거절 결과 안내 팝업 (TeamMatchDetailPage의 InfoModal 사용 패턴과 동일)
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' })

  useEffect(() => {
    let isMounted = true

    apiClient
      .get('/notifications/summary')
      .then((res) => {
        if (isMounted) setSummary(res.data)
      })
      .catch((err) => console.error(err))

    return () => {
      isMounted = false
    }
  }, [])

  // 수락/거절 후 알림 목록을 최신 상태로 다시 불러온다.
  // (accept는 두 팀에 걸려있던 다른 pending 신청까지 함께 rejected 처리될 수 있어
  //  단순히 클릭한 항목 하나만 로컬에서 지우면 목록이 실제 서버 상태와 어긋날 수 있다)
  const refreshSummary = async () => {
    try {
      const res = await apiClient.get('/notifications/summary')
      setSummary(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const closeInfoModal = () => {
    setInfoModal({ isOpen: false, title: '', message: '' })
  }

  useEffect(() => {
    if (!isDropdownOpen) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  const handleBellClick = () => {
    setIsDropdownOpen((prev) => !prev)
  }

  const handleChatItemClick = (chatRoomId, chatRoomType) => {
    setIsDropdownOpen(false)
    navigate(chatRoomType === 'teamMatch' ? `/team-match-chat/${chatRoomId}` : `/chat/${chatRoomId}`)
  }

  const handleRespondInvite = async (inviteId, action) => {
    setRespondingInviteId(inviteId)
    setInviteErrorMessage('')

    try {
      const res = await apiClient.patch(`/team-invites/${inviteId}`, { action })
      setSummary((prev) => ({
        ...prev,
        totalCount: prev.totalCount - 1,
        pendingInvites: prev.pendingInvites.filter((invite) => invite.inviteId !== inviteId),
      }))

      // 수락이고 팀 정보를 받아온 경우에만 팀 화면으로 이동한다 (거절이거나 teamId가 없으면 기존 동작 유지)
      if (action === 'accept' && res.data?.teamId) {
        setIsDropdownOpen(false)
        navigate('/team-setup')
      }
    } catch (err) {
      console.error(err)
      setInviteErrorMessage('초대 처리에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setRespondingInviteId(null)
    }
  }

  // 매칭 신청(관심 보내기) 수락. 채팅방 생성까지 서버에서 원자적으로 처리되므로,
  // 응답으로 받은 chatRoomId로 바로 채팅방까지 이동시킨다.
  const handleAcceptMatchRequest = async (requestId) => {
    setRespondingMatchRequestId(requestId)

    try {
      const res = await apiClient.patch(`/match-requests/${requestId}/accept`)

      // 채팅방 id를 받아온 경우 바로 채팅방으로 이동시키고, 못 받아온 경우에만 기존 팝업으로 안내한다
      if (res.data?.chatRoomId) {
        setIsDropdownOpen(false)
        navigate(`/team-match-chat/${res.data.chatRoomId}`)
      } else {
        setInfoModal({
          isOpen: true,
          title: '매칭 성사',
          message: '매칭이 성사됐어요! 채팅방이 생성됐어요.',
        })
      }
    } catch (err) {
      console.error(err)
      const message =
        err.response?.data?.message ?? '수락 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
      setInfoModal({ isOpen: true, title: '수락 실패', message })
    } finally {
      setRespondingMatchRequestId(null)
      refreshSummary()
    }
  }

  // 매칭 신청 거절. 반대 방향 신청까지 서버에서 함께 정리되지만, 그건 상대 팀의 목록에
  // 영향을 주는 것이라 내 목록에서는 클릭한 항목만 지우면 된다 (teamInvite 거절 처리와 동일한 패턴)
  const handleRejectMatchRequest = async (requestId) => {
    setRespondingMatchRequestId(requestId)
    setMatchRequestErrorMessage('')

    try {
      await apiClient.patch(`/match-requests/${requestId}/reject`)
      setSummary((prev) => ({
        ...prev,
        totalCount: prev.totalCount - 1,
        pendingMatchRequests: prev.pendingMatchRequests.filter(
          (request) => request.requestId !== requestId
        ),
      }))
    } catch (err) {
      console.error(err)
      setMatchRequestErrorMessage('매칭 신청 처리에 실패했어요. 잠시 후 다시 시도해주세요.')
      refreshSummary()
    } finally {
      setRespondingMatchRequestId(null)
    }
  }

  const unreadChatTotal = summary.unreadChats.reduce((sum, chat) => sum + chat.unreadCount, 0)
  const hasNoNotifications =
    summary.unreadChats.length === 0 &&
    summary.pendingInvites.length === 0 &&
    summary.pendingMatchRequests.length === 0

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-button"
        onClick={handleBellClick}
        aria-label="알림"
      >
        <svg viewBox="0 0 64 64" width="22" height="22">
          <path
            d="M32 8c-8 0-14 6-14 15v9l-6 10h40l-6-10v-9c0-9-6-15-14-15z"
            fill="none"
            stroke="#4A2E22"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M26 46a6 6 0 0 0 12 0"
            fill="none"
            stroke="#4A2E22"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        {summary.totalCount > 0 && (
          <span className="notification-bell-badge">
            {summary.totalCount > 99 ? '99+' : summary.totalCount}
          </span>
        )}
      </button>

      {isDropdownOpen && (
        <div className="notification-bell-dropdown">
          {hasNoNotifications ? (
            <p className="notification-bell-empty">새로운 알림이 없어요</p>
          ) : (
            <>
              <div className="notification-bell-section">
                <button
                  type="button"
                  className="notification-bell-section-header"
                  onClick={() => setIsChatsExpanded((prev) => !prev)}
                >
                  <span>채팅이 도착했어요 {unreadChatTotal}</span>
                  <span className="notification-bell-chevron">{isChatsExpanded ? '▲' : '▼'}</span>
                </button>

                {isChatsExpanded && (
                  <div className="notification-bell-list">
                    {summary.unreadChats.length === 0 && (
                      <p className="notification-bell-list-empty">안읽은 채팅이 없어요</p>
                    )}
                    {summary.unreadChats.map((chat) => (
                      <button
                        type="button"
                        key={`${chat.chatRoomType}-${chat.chatRoomId}`}
                        className="notification-bell-chat-item"
                        onClick={() => handleChatItemClick(chat.chatRoomId, chat.chatRoomType)}
                      >
                        <span className="notification-bell-chat-nickname">
                          {chat.partnerNickname}
                        </span>
                        <span className="notification-bell-chat-count">{chat.unreadCount}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="notification-bell-divider" />

              <div className="notification-bell-section">
                <button
                  type="button"
                  className="notification-bell-section-header"
                  onClick={() => setIsInvitesExpanded((prev) => !prev)}
                >
                  <span>팀에 초대했어요 {summary.pendingInvites.length}</span>
                  <span className="notification-bell-chevron">{isInvitesExpanded ? '▲' : '▼'}</span>
                </button>

                {isInvitesExpanded && (
                  <div className="notification-bell-list">
                    {summary.pendingInvites.length === 0 && (
                      <p className="notification-bell-list-empty">대기중인 초대가 없어요</p>
                    )}
                    {inviteErrorMessage && (
                      <p className="notification-bell-invite-error">{inviteErrorMessage}</p>
                    )}
                    {summary.pendingInvites.map((invite) => (
                      <div className="notification-bell-invite-item" key={invite.inviteId}>
                        <span className="notification-bell-invite-nickname">
                          {invite.fromUserNickname}
                        </span>
                        <div className="notification-bell-invite-actions">
                          <button
                            type="button"
                            className="notification-bell-invite-button notification-bell-invite-accept"
                            onClick={() => handleRespondInvite(invite.inviteId, 'accept')}
                            disabled={respondingInviteId === invite.inviteId}
                          >
                            수락
                          </button>
                          <button
                            type="button"
                            className="notification-bell-invite-button notification-bell-invite-reject"
                            onClick={() => handleRespondInvite(invite.inviteId, 'reject')}
                            disabled={respondingInviteId === invite.inviteId}
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="notification-bell-divider" />

              <div className="notification-bell-section">
                <button
                  type="button"
                  className="notification-bell-section-header"
                  onClick={() => setIsMatchRequestsExpanded((prev) => !prev)}
                >
                  <span>관심을 보였어요 {summary.pendingMatchRequests.length}</span>
                  <span className="notification-bell-chevron">
                    {isMatchRequestsExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {isMatchRequestsExpanded && (
                  <div className="notification-bell-list">
                    {summary.pendingMatchRequests.length === 0 && (
                      <p className="notification-bell-list-empty">받은 매칭 신청이 없어요</p>
                    )}
                    {matchRequestErrorMessage && (
                      <p className="notification-bell-invite-error">{matchRequestErrorMessage}</p>
                    )}
                    {summary.pendingMatchRequests.map((request) => (
                      <div className="notification-bell-invite-item" key={request.requestId}>
                        <span className="notification-bell-invite-nickname">
                          {request.fromTeamName} 팀이 관심을 보였어요
                        </span>
                        <div className="notification-bell-invite-actions">
                          <button
                            type="button"
                            className="notification-bell-invite-button notification-bell-invite-accept"
                            onClick={() => handleAcceptMatchRequest(request.requestId)}
                            disabled={respondingMatchRequestId === request.requestId}
                          >
                            수락
                          </button>
                          <button
                            type="button"
                            className="notification-bell-invite-button notification-bell-invite-reject"
                            onClick={() => handleRejectMatchRequest(request.requestId)}
                            disabled={respondingMatchRequestId === request.requestId}
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
