import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuthStore } from '../store/authStore'
import './ChatRoomPage.css'

export default function ChatRoomPage() {
  const { chatRoomId } = useParams()
  const navigate = useNavigate()
  const myUserId = useAuthStore((state) => state.user?.userId)

  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeError, setCodeError] = useState('')

  const messagesEndRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    async function fetchMessages() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await apiClient.get(`/candidate-chat-rooms/${chatRoomId}/messages`)
        if (isMounted) {
          setMessages(response.data.messages ?? [])
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setLoadError('메시지를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchMessages()

    return () => {
      isMounted = false
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
      const response = await apiClient.post(`/candidate-chat-rooms/${chatRoomId}/messages`, {
        content,
      })
      setMessages((prev) => [...prev, response.data])
      setInputValue('')
    } catch (err) {
      console.error(err)
      setSendError('메시지를 보내지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSending(false)
    }
  }

  const handleSendCode = async () => {
    if (isSendingCode) {
      return
    }

    setIsSendingCode(true)
    setCodeError('')

    try {
      const codeResponse = await apiClient.get('/users/me/invite-code')
      const messageResponse = await apiClient.post(`/candidate-chat-rooms/${chatRoomId}/messages`, {
        content: `내 코드는 ${codeResponse.data.inviteCode} 이야`,
      })
      setMessages((prev) => [...prev, messageResponse.data])
    } catch (err) {
      console.error(err)
      setCodeError('코드를 보내지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSendingCode(false)
    }
  }

  return (
    <div className="chat-room-page">
      <header className="chat-room-header">
        <button
          type="button"
          className="chat-room-back-button"
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
        <h1 className="chat-room-title">채팅</h1>
      </header>

      <div className="chat-room-messages">
        {isLoading && <p className="chat-room-status">메시지를 불러오는 중이에요...</p>}

        {!isLoading && loadError && (
          <p className="chat-room-status chat-room-status-error">{loadError}</p>
        )}

        {!isLoading && !loadError && messages.length === 0 && (
          <p className="chat-room-status">아직 주고받은 메시지가 없어요.</p>
        )}

        {!isLoading &&
          !loadError &&
          messages.map((message) => {
            const isMine = message.senderId === myUserId
            return (
              <div
                key={message.messageId}
                className={`chat-room-bubble-row ${isMine ? 'chat-room-bubble-row-mine' : ''}`}
              >
                <div
                  className={`chat-room-bubble ${isMine ? 'chat-room-bubble-mine' : 'chat-room-bubble-other'}`}
                >
                  {message.content}
                </div>
              </div>
            )
          })}

        <div ref={messagesEndRef} />
      </div>

      {(sendError || codeError) && (
        <p className="chat-room-status chat-room-status-error chat-room-status-inline">
          {sendError || codeError}
        </p>
      )}

      <form className="chat-room-input-bar" onSubmit={handleSendMessage}>
        <button
          type="button"
          className="chat-room-code-button"
          onClick={handleSendCode}
          disabled={isSendingCode}
          aria-label="코드 보내기"
        >
          <svg viewBox="0 0 64 64" width="22" height="22">
            <rect
              x="10"
              y="18"
              width="44"
              height="28"
              rx="6"
              fill="none"
              stroke="#F0AFC4"
              strokeWidth="4"
            />
            <path
              d="M24 26 16 32l8 6M40 26l8 6-8 6"
              fill="none"
              stroke="#F0AFC4"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <input
          type="text"
          className="chat-room-input"
          placeholder="메시지를 입력하세요"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          disabled={isSending}
        />

        <button
          type="submit"
          className="chat-room-send-button"
          disabled={isSending || !inputValue.trim()}
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
