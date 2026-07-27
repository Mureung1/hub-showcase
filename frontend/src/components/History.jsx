import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getRecommendationHistory, addFavorite, removeFavorite } from '../api/index.js'
import IssueCard from './IssueCard.jsx'
import { DIFFICULTY_META, formatSessionTime } from '../utils/format.js'
import { TOPIC_OPTIONS } from '../utils/preferences.js'

// 8 · 전체 검색 이력 — 스텝퍼 흐름 밖 부가 화면. 지금까지 검색한 모든 세션을 최신순으로 보여주고
// (Recommendation은 삭제 없이 계속 쌓이는 설계라 즐겨찾기 안 한 이슈도 항상 여기서 볼 수 있다),
// "즐겨찾기만 보기"는 이미 받아온 응답을 프론트에서 필터링하는 것으로 처리한다(별도 API 없음)
function History() {
  const { githubId, setRecommendation, setSelectedItem } = useOutletContext()
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ['recommendationHistory', githubId],
    queryFn: () => getRecommendationHistory(githubId),
    enabled: Boolean(githubId),
  })

  // 성공 후에만 다시 불러온다(낙관적 업데이트 없음) — Result.jsx의 handleToggleFavorite와 같은 방식
  async function handleToggleFavorite(item) {
    if (item.isFavorited) {
      await removeFavorite(githubId, item.repoFullName, item.issueNumber)
    } else {
      await addFavorite(githubId, item.repoFullName, item.issueNumber)
    }
    refetch()
  }

  // 상세 화면은 recommendation.id 기준으로 LLM 분석을 지연 조회한다(Detail.jsx) — 이력에서 들어갈 때도
  // 그 이슈가 속한 세션을 함께 recommendation으로 세팅해야 상세 화면·"다른 이슈 보기"가 정상 동작한다
  function handleSelect(session, item) {
    setRecommendation(session)
    setSelectedItem(item)
  }

  if (!githubId) {
    return (
      <div className="panel">
        <h1 className="a-title">아직 검색 이력이 없어요</h1>
        <p className="a-lead">GitHub 아이디로 이슈를 찾아보면 여기서 다시 볼 수 있어요.</p>
        <Link to="/input" className="btn btn-primary">
          시작하기
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="panel">
        <h1 className="a-title">
          <span className="spinner" />
          이력을 불러오고 있어요
        </h1>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel">
        <h1 className="a-title">이력을 불러오지 못했어요</h1>
        <p className="a-lead">{error.message}</p>
      </div>
    )
  }

  return (
    <>
      <div className="r-head">
        <div className="r-head-row">
          <h1>전체 검색 이력</h1>
          <button
            type="button"
            className={favoritesOnly ? 'btn btn-primary r-refetch-btn' : 'btn btn-soft r-refetch-btn'}
            onClick={() => setFavoritesOnly((prev) => !prev)}
          >
            즐겨찾기만 보기
          </button>
        </div>
        <p>지금까지 검색한 이슈를 검색 시점별로 모아봤어요.</p>
      </div>

      {sessions.length === 0 && (
        <div className="panel">
          <p className="lead">아직 검색한 이슈가 없어요.</p>
        </div>
      )}

      {sessions.length > 0 && sessions.every((session) =>
        (favoritesOnly ? session.items.filter((item) => item.isFavorited) : session.items).length === 0,
      ) && (
        <div className="panel">
          <p className="lead">즐겨찾기한 이슈가 아직 없어요.</p>
        </div>
      )}

      {sessions.map((session) => {
        const visibleItems = favoritesOnly
          ? session.items.filter((item) => item.isFavorited)
          : session.items
        if (visibleItems.length === 0) {
          return null
        }
        const filters = [
          ...session.preferences.languages,
          DIFFICULTY_META[session.preferences.difficulty].label,
          ...session.preferences.topics.map(
            (value) => TOPIC_OPTIONS.find((topic) => topic.value === value)?.label ?? value,
          ),
        ]
        return (
          <div className="h-session" key={session.id}>
            <div className="h-session-head">
              <span className="h-session-time">{formatSessionTime(session.createdAt)}</span>
              <div className="filterbar">
                {filters.map((filter) => (
                  <span key={filter} className="filter">
                    {filter}
                  </span>
                ))}
              </div>
            </div>
            {visibleItems.map((item) => (
              <IssueCard
                key={item.issueUrl}
                item={item}
                onSelect={() => handleSelect(session, item)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}

export default History
