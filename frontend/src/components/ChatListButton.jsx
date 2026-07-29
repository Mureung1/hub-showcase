import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import './ChatListButton.css'

// 독립적인 채팅 목록 버튼. NotificationBell과 동일한 패턴으로 화면별 특수 로직 없이 그대로 끼워 넣을 수 있다.
export default function ChatListButton() {
  const navigate = useNavigate()
  const [unreadTotal, setUnreadTotal] = useState(0)

  useEffect(() => {
    let isMounted = true

    apiClient
      .get('/chat-rooms/my')
      .then((res) => {
        if (!isMounted) return
        const total = (res.data ?? []).reduce((sum, room) => sum + room.unreadCount, 0)
        setUnreadTotal(total)
      })
      .catch((err) => console.error(err))

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <button
      type="button"
      className="chat-list-button"
      onClick={() => navigate('/chat-list')}
      aria-label="채팅 목록"
    >
      <svg viewBox="0 0 64 64" width="20" height="20">
        <path
          d="M8 12h48v28H26l-10 10v-10H8z"
          fill="none"
          stroke="#4A2E22"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="26" r="2.5" fill="#4A2E22" />
        <circle cx="32" cy="26" r="2.5" fill="#4A2E22" />
        <circle cx="44" cy="26" r="2.5" fill="#4A2E22" />
      </svg>
      {unreadTotal > 0 && (
        <span className="chat-list-button-badge">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
      )}
    </button>
  )
}
