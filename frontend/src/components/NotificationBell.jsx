import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import './NotificationBell.css'

// 독립적인 알림 벨 컴포넌트. 화면별 특수 로직 없이 어디든 그대로 끼워 넣을 수 있다.
export default function NotificationBell() {
  const navigate = useNavigate()
  const containerRef = useRef(null)

  const [summary, setSummary] = useState({ totalCount: 0, unreadChats: [], pendingInvites: [] })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isChatsExpanded, setIsChatsExpanded] = useState(false)
  const [isInvitesExpanded, setIsInvitesExpanded] = useState(false)
  const [respondingInviteId, setRespondingInviteId] = useState(null)
  const [inviteErrorMessage, setInviteErrorMessage] = useState('')

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

  const handleChatItemClick = (chatRoomId) => {
    setIsDropdownOpen(false)
    navigate(`/chat/${chatRoomId}`)
  }

  const handleRespondInvite = async (inviteId, action) => {
    setRespondingInviteId(inviteId)
    setInviteErrorMessage('')

    try {
      await apiClient.patch(`/team-invites/${inviteId}`, { action })
      setSummary((prev) => ({
        ...prev,
        totalCount: prev.totalCount - 1,
        pendingInvites: prev.pendingInvites.filter((invite) => invite.inviteId !== inviteId),
      }))
    } catch (err) {
      console.error(err)
      setInviteErrorMessage('초대 처리에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setRespondingInviteId(null)
    }
  }

  const unreadChatTotal = summary.unreadChats.reduce((sum, chat) => sum + chat.unreadCount, 0)
  const hasNoNotifications = summary.unreadChats.length === 0 && summary.pendingInvites.length === 0

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
                        key={chat.chatRoomId}
                        className="notification-bell-chat-item"
                        onClick={() => handleChatItemClick(chat.chatRoomId)}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
