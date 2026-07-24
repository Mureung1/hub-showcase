import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import NotificationBell from '../components/NotificationBell'
import './DatingSameResultsPage.css'

// 카드 아바타 색상은 실제 데이터가 아니라 순서대로 돌려쓰는 장식용 색상이다
const AVATAR_COLORS = ['mint', 'peach', 'pink', 'blue', 'yellow']

export default function DatingSameResultsPage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // 채팅 연결 확인 팝업을 띄울 후보. null이면 팝업이 닫혀있는 상태
  const [chatTargetCandidate, setChatTargetCandidate] = useState(null)
  const [isCreatingChatRoom, setIsCreatingChatRoom] = useState(false)
  const [chatErrorMessage, setChatErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchCandidates() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await apiClient.post('/matching/dating-same')
        if (isMounted) {
          setCandidates(response.data.candidates ?? [])
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

    fetchCandidates()

    return () => {
      isMounted = false
    }
  }, [])

  const handleChatIconClick = (candidate) => {
    setChatErrorMessage('')
    setChatTargetCandidate(candidate)
  }

  const handleCancelChatModal = () => {
    setChatTargetCandidate(null)
    setChatErrorMessage('')
  }

  const handleConfirmChat = async () => {
    if (!chatTargetCandidate) {
      return
    }

    setIsCreatingChatRoom(true)
    setChatErrorMessage('')

    try {
      const response = await apiClient.post('/candidate-chat-rooms', {
        targetUserId: chatTargetCandidate.userId,
      })
      navigate(`/chat/${response.data.chatRoomId}`)
    } catch (err) {
      console.error(err)
      setChatErrorMessage('채팅방을 연결하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsCreatingChatRoom(false)
    }
  }

  return (
    <div className="dating-same-results-page">
      <div className="dating-same-results-notification-bell">
        <NotificationBell />
      </div>

      <span className="dating-same-results-eyebrow">매칭 결과</span>
      <h1 className="dating-same-results-title">취향이 비슷한 동성 친구들이에요!</h1>

      {isLoading && (
        <p className="dating-same-results-status">매칭 결과를 불러오는 중이에요...</p>
      )}

      {!isLoading && errorMessage && (
        <p className="dating-same-results-status dating-same-results-status-error">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && candidates.length === 0 && (
        <p className="dating-same-results-status">아직 매칭 가능한 동성 친구가 없어요.</p>
      )}

      {!isLoading && !errorMessage && candidates.length > 0 && (
        <div className="dating-same-results-list">
          {candidates.map((candidate, index) => (
            <div className="dating-same-results-card" key={candidate.userId}>
              <div
                className={`dating-same-results-avatar dating-same-results-avatar-${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
              />

              <div className="dating-same-results-info">
                <div className="dating-same-results-name">{candidate.nickname}</div>
                <div className="dating-same-results-tags">
                  <span className="dating-same-results-tag">{candidate.hobbyPrimaryType}</span>
                  <span className="dating-same-results-tag">{candidate.hobbySecondaryType}</span>
                </div>
              </div>

              <button
                type="button"
                className="dating-same-results-chat-button"
                onClick={() => handleChatIconClick(candidate)}
                aria-label="채팅하기"
              >
                <svg viewBox="0 0 64 64" width="20" height="20">
                  <path
                    d="M8 12h48v28H26l-10 10v-10H8z"
                    fill="#FFFFFF"
                    stroke="#4A2E22"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  />
                  <circle cx="20" cy="26" r="2.5" fill="#4A2E22" />
                  <circle cx="32" cy="26" r="2.5" fill="#4A2E22" />
                  <circle cx="44" cy="26" r="2.5" fill="#4A2E22" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            className="dating-same-results-team-setup-button"
            onClick={() => navigate('/team-setup')}
          >
            팀 구성하기
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={chatTargetCandidate !== null}
        title="채팅을 연결할까요?"
        message={chatTargetCandidate ? `${chatTargetCandidate.nickname}님과 채팅을 시작해요.` : ''}
        onConfirm={handleConfirmChat}
        onCancel={handleCancelChatModal}
        isConfirmLoading={isCreatingChatRoom}
        errorMessage={chatErrorMessage}
      />
    </div>
  )
}
