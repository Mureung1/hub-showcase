import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/authStore'
import './TeamMatchChatRoomPage.css'

const POLLING_INTERVAL_MS = 5000

export default function TeamMatchChatRoomPage() {
  const { chatRoomId } = useParams()
  const navigate = useNavigate()
  const myUserId = useAuthStore((state) => state.user?.userId)

  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const messagesEndRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function fetchMessages() {
      try {
        const response = await apiClient.get(`/team-match-chat-rooms/${chatRoomId}/messages`)
        if (isMounted) {
          setMessages(response.data.messages ?? [])
          setLoadError('')
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          if (err.response?.status === 403) {
            setLoadError('참여 중인 채팅방이 아니에요.')
            clearInterval(intervalId)
          } else if (err.response?.status === 404) {
            setLoadError('존재하지 않는 채팅방이에요.')
            clearInterval(intervalId)
          } else {
            setLoadError('메시지를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchMessages()
    const intervalId = setInterval(fetchMessages, POLLING_INTERVAL_MS)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [chatRoomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const handleSendMessage = async (event) => {
    event.preventDefault()

    const content = inputValue.trim()
    if (!content || isSending) {
      return
    }

    setIsSending(true)
    setSendError('')

    try {
      await apiClient.post(`/team-match-chat-rooms/${chatRoomId}/messages`, { content })
      setInputValue('')

      // 폴링 주기를 기다리지 않고 전송 직후 바로 최신 목록을 반영한다
      const response = await apiClient.get(`/team-match-chat-rooms/${chatRoomId}/messages`)
      setMessages(response.data.messages ?? [])
    } catch (err) {
      console.error(err)
      setSendError('메시지를 보내지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="team-chat-page">
      <header className="team-chat-header">
        <button
          type="button"
          className="team-chat-back-button"
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
        <h1 className="team-chat-title">팀 채팅</h1>
      </header>

      <div className="team-chat-messages">
        {isLoading && <p className="team-chat-status">메시지를 불러오는 중이에요...</p>}

        {!isLoading && loadError && (
          <p className="team-chat-status team-chat-status-error">{loadError}</p>
        )}

        {!isLoading && !loadError && messages.length === 0 && (
          <p className="team-chat-status">아직 주고받은 메시지가 없어요.</p>
        )}

        {!isLoading &&
          !loadError &&
          messages.map((message) => {
            const isMine = message.senderId === myUserId

            return (
              <div
                key={message.messageId}
                className={`team-chat-bubble-row ${isMine ? 'team-chat-bubble-row-mine' : ''}`}
              >
                {!isMine && (
                  <span className="team-chat-sender-name">
                    {message.senderNickname ?? '알 수 없음'}
                  </span>
                )}
                <div
                  className={`team-chat-bubble ${isMine ? 'team-chat-bubble-mine' : 'team-chat-bubble-other'}`}
                >
                  {message.content}
                </div>
              </div>
            )
          })}

        <div ref={messagesEndRef} />
      </div>

      {sendError && (
        <p className="team-chat-status team-chat-status-error team-chat-status-inline">
          {sendError}
        </p>
      )}

      <form className="team-chat-input-bar" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="team-chat-input"
          placeholder="메시지를 입력하세요"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          disabled={isSending || !!loadError}
        />

        <button
          type="submit"
          className="team-chat-send-button"
          disabled={isSending || !inputValue.trim() || !!loadError}
          aria-label="전송"
        >
          <svg viewBox="0 0 64 64" width="20" height="20">
            <path
              d="M14 32h32M32 18l14 14-14 14"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}
