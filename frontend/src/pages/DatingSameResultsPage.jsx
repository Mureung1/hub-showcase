import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import './DatingSameResultsPage.css'

// 카드 아바타 색상은 실제 데이터가 아니라 순서대로 돌려쓰는 장식용 색상이다
const AVATAR_COLORS = ['mint', 'peach', 'pink', 'blue', 'yellow']

export default function DatingSameResultsPage() {
  const [candidates, setCandidates] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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

  return (
    <div className="dating-same-results-page">
      <span className="dating-same-results-eyebrow">매칭 결과</span>
      <h1 className="dating-same-results-title">동성 그룹 매칭 결과</h1>

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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
