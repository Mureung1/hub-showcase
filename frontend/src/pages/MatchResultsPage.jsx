import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiClient } from '../api/client'
import { getGuestPolicyLabel, getTemperaturePreferenceLabel } from '../utils/lifestyleLabels'
import './MatchResultsPage.css'

// 카드 아바타 색상은 실제 데이터가 아니라 순서대로 돌려쓰는 장식용 색상이다
const AVATAR_COLORS = ['mint', 'peach', 'pink', 'blue', 'yellow']

// similarityScore가 없거나 숫자가 아니어도 화면이 깨지지 않도록 안전하게 퍼센트 문자열을 만든다
function getSimilarityPercentLabel(similarityScore) {
  if (typeof similarityScore !== 'number' || Number.isNaN(similarityScore)) {
    return '-%'
  }
  return `${Math.round(similarityScore * 100)}%`
}

// userId를 key로, 각 유저의 프로필 조회 상태를 담는 객체를 만든다
// status: 'success' | 'error' (아직 이 객체에 없으면 = 로딩 중)
function buildProfilesById(results) {
  const profilesById = {}
  for (const result of results) {
    profilesById[result.userId] = result
  }
  return profilesById
}

export default function MatchResultsPage() {
  const location = useLocation()
  // S-08에서 친구형을 선택하고 넘어온 경우에만 취미 필터를 기본으로 켠다.
  // /matches로 바로 접속하는 등 state가 없으면 기존과 동일하게 필터 꺼진 상태로 시작한다.
  const [applyHobbyFilter, setApplyHobbyFilter] = useState(
    location.state?.roommateType === 'friend',
  )
  // 현재 조회 중인 roommateType(조회용 오버라이드). applyHobbyFilter와 항상 세트로 함께 바뀐다.
  // friend + true, business + false 두 조합만 존재해야 한다.
  const [currentRoommateType, setCurrentRoommateType] = useState(
    location.state?.roommateType === 'friend' ? 'friend' : 'business',
  )
  const [matches, setMatches] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [profilesById, setProfilesById] = useState({})

  useEffect(() => {
    let isMounted = true

    async function fetchMatches() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await apiClient.post('/matching/roommate', {
          applyHobbyFilter,
          roommateTypeOverride: currentRoommateType,
        })
        if (isMounted) {
          setMatches(response.data.matches ?? [])
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

    fetchMatches()

    return () => {
      isMounted = false
    }
  }, [applyHobbyFilter, currentRoommateType])

  // 매칭 리스트가 생기면, 각 후보의 닉네임/소프트필터를 프로필 API로 병렬 조회한다
  // 한 명이 실패(404 등)해도 나머지 결과와 화면 전체에는 영향을 주지 않는다
  useEffect(() => {
    if (matches.length === 0) {
      return
    }

    let isMounted = true

    async function fetchProfiles() {
      const results = await Promise.all(
        matches.map(async (match) => {
          try {
            const response = await apiClient.get(`/users/${match.userId}/profile`)
            return {
              userId: match.userId,
              status: 'success',
              nickname: response.data.nickname,
              guestPolicy: response.data.softFilters.guestPolicy,
              temperaturePreference: response.data.softFilters.temperaturePreference,
            }
          } catch (err) {
            console.error(err)
            return { userId: match.userId, status: 'error' }
          }
        }),
      )

      if (isMounted) {
        setProfilesById(buildProfilesById(results))
      }
    }

    fetchProfiles()

    return () => {
      isMounted = false
    }
  }, [matches])

  const handleChatClick = () => {
    console.log('채팅 이동 예정')
  }

  // 취미 필터와 roommateType을 항상 세트로 함께 반전시킨다.
  // (friend, true) <-> (business, false) 두 조합만 존재해야 하므로 따로 바꾸지 않는다.
  // 둘 중 하나라도 바뀌면 위 useEffect가 다시 실행되어 새 조건으로 매칭 API를 재호출한다.
  const handleToggleHobbyFilter = () => {
    setApplyHobbyFilter((prev) => !prev)
    setCurrentRoommateType((prev) => (prev === 'friend' ? 'business' : 'friend'))
  }

  return (
    <div className="match-results-page">
      <span className="match-results-eyebrow">매칭 결과</span>
      <h1 className="match-results-title">당신과 생활성향이 비슷한 분들이에요!</h1>

      {isLoading && (
        <p className="match-results-status">매칭 결과를 불러오는 중이에요...</p>
      )}

      {!isLoading && errorMessage && (
        <p className="match-results-status match-results-status-error">{errorMessage}</p>
      )}

      {!isLoading && !errorMessage && matches.length === 0 && (
        <p className="match-results-status">아직 조건에 맞는 매칭 후보가 없어요.</p>
      )}

      {!isLoading && !errorMessage && matches.length > 0 && (
        <div className="match-results-list">
          {matches.map((match, index) => {
            const profile = profilesById[match.userId]
            const isProfileLoading = !profile
            const isProfileError = profile?.status === 'error'

            const displayName = isProfileLoading
              ? '불러오는 중...'
              : isProfileError
                ? `유저 #${match.userId}`
                : profile.nickname

            const guestPolicyLabel = isProfileLoading
              ? '불러오는 중...'
              : isProfileError
                ? '정보 없음'
                : getGuestPolicyLabel(profile.guestPolicy)

            const temperatureLabel = isProfileLoading
              ? '불러오는 중...'
              : isProfileError
                ? '정보 없음'
                : getTemperaturePreferenceLabel(profile.temperaturePreference)

            return (
              <div className="match-results-card" key={match.userId}>
                <div
                  className={`match-results-avatar match-results-avatar-${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                />

                <div className="match-results-info">
                  <div className="match-results-name">{displayName}</div>
                  <div className="match-results-tags">
                    <span className="match-results-tag match-results-tag-mint">
                      {guestPolicyLabel}
                    </span>
                    <span className="match-results-tag match-results-tag-blue">
                      {temperatureLabel}
                    </span>
                  </div>
                </div>

                <div
                  className="match-results-percent-badge"
                  aria-label={`유사도 ${getSimilarityPercentLabel(match.similarityScore)}`}
                >
                  {getSimilarityPercentLabel(match.similarityScore)}
                </div>

                <button
                  type="button"
                  className="match-results-chat-button"
                  onClick={handleChatClick}
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
            )
          })}
        </div>
      )}

      <button
        type="button"
        className="match-results-hobby-button"
        onClick={handleToggleHobbyFilter}
        disabled={isLoading}
      >
        {applyHobbyFilter ? '단순 룸메이트를 구하는 거라면?' : '취미까지 같은 분들을 보고싶다면?'}
      </button>
    </div>
  )
}
