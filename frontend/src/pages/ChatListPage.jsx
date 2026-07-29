import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import './ChatListPage.css'

// 같은 날이면 시간만, 아니면 날짜만 보여준다 (카카오톡 채팅 목록과 동일한 방식)
function formatChatTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isSameDay) {
    return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function ChatListPage() {
  const navigate = useNavigate()
  const [chatRooms, setChatRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    apiClient
      .get('/chat-rooms/my')
      .then((res) => {
        if (isMounted) setChatRooms(res.data ?? [])
      })
      .catch((err) => {
        console.error(err)
        if (isMounted) {
          setErrorMessage('채팅방 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // NotificationBell의 handleChatItemClick과 동일한 분기 방식 (candidate -> /chat, teamMatch -> /team-match-chat)
  const handleRoomClick = (room) => {
    navigate(
      room.chatRoomType === 'teamMatch' ? `/team-match-chat/${room.chatRoomId}` : `/chat/${room.chatRoomId}`,
    )
  }

  return (
    <div className="chat-list-page">
      <header className="chat-list-header">
        <button
          type="button"
          className="chat-list-back-button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
        >
          <svg viewBox="0 0 64 64" width="20" height="20">
            <path
              d="M40 12 20 32l20 20"
              fill="none"
              stroke="#4A2E22"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="chat-list-title">채팅</h1>
      </header>

      <div className="chat-list-body">
        {isLoading && <p className="chat-list-status">채팅방을 불러오는 중이에요...</p>}

        {!isLoading && errorMessage && (
          <p className="chat-list-status chat-list-status-error">{errorMessage}</p>
        )}

        {!isLoading && !errorMessage && chatRooms.length === 0 && (
          <p className="chat-list-status">아직 채팅방이 없어요</p>
        )}

        {!isLoading && !errorMessage && chatRooms.length > 0 && (
          <div className="chat-list-items">
            {chatRooms.map((room) => (
              <button
                type="button"
                key={`${room.chatRoomType}-${room.chatRoomId}`}
                className="chat-list-item"
                onClick={() => handleRoomClick(room)}
              >
                <div className="chat-list-item-avatar" />

                <div className="chat-list-item-body">
                  <div className="chat-list-item-top-row">
                    <span className="chat-list-item-type">
                      {room.chatRoomType === 'teamMatch' ? '이성' : '동성'}
                    </span>
                    <span className="chat-list-item-name">{room.partnerName ?? '알 수 없음'}</span>
                  </div>
                  <p className="chat-list-item-preview">{room.lastMessage ?? '아직 메시지가 없어요'}</p>
                </div>

                <div className="chat-list-item-meta">
                  <span className="chat-list-item-time">{formatChatTime(room.updatedAt)}</span>
                  {room.unreadCount > 0 && (
                    <span className="chat-list-item-unread">
                      {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
