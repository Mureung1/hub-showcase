import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getRecommendationHistory, addFavorite, removeFavorite } from '../api/index.js'
import IssueCard from './IssueCard.jsx'
import { DIFFICULTY_META, formatSessionTime } from '../utils/format.js'
import { TOPIC_OPTIONS } from '../utils/preferences.js'

const ALL = 'all'
const SESSIONS_PER_PAGE = 5

// 8 · 전체 검색 이력 — 스텝퍼 흐름 밖 부가 화면. 지금까지 검색한 모든 세션을 최신순으로 보여주고
// (Recommendation은 삭제 없이 계속 쌓이는 설계라 즐겨찾기 안 한 이슈도 항상 여기서 볼 수 있다),
// 언어/주제/즐겨찾기 필터와 페이지네이션은 전부 이미 받아온 응답을 프론트에서 처리한다(별도 API 없음 —
// 사용자당 세션 수가 크지 않은 이 앱 규모에서는 전체를 한 번에 받고 화면에서만 나누는 게 더 단순함)
function History() {
  const { githubId, setRecommendation, setSelectedItem } = useOutletContext()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [languageFilter, setLanguageFilter] = useState(ALL)
  const [topicFilter, setTopicFilter] = useState(ALL)
  const [page, setPage] = useState(1)

  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ['recommendationHistory', githubId],
    queryFn: () => getRecommendationHistory(githubId),
    enabled: Boolean(githubId),
  })

  // 필터 선택지는 현재 필터 결과가 아니라 전체 이력 기준으로 뽑는다 — 필터를 걸수록 선택지가 줄어들면 헷갈림
  const availableLanguages = useMemo(() => {
    if (!sessions) return []
    const languages = new Set(sessions.flatMap((session) => session.items.map((item) => item.primaryLanguage)))
    return [...languages].sort()
  }, [sessions])

  const availableTopics = useMemo(() => {
    if (!sessions) return []
    const topics = new Set(sessions.flatMap((session) => session.preferences.topics))
    return [...topics].sort()
  }, [sessions])

  const filteredSessions = useMemo(() => {
    if (!sessions) return []
    return sessions
      .filter((session) => topicFilter === ALL || session.preferences.topics.includes(topicFilter))
      .map((session) => ({
        ...session,
        items: session.items.filter(
          (item) =>
            (!favoritesOnly || item.isFavorited) && (languageFilter === ALL || item.primaryLanguage === languageFilter),
        ),
      }))
      .filter((session) => session.items.length > 0)
  }, [sessions, favoritesOnly, languageFilter, topicFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / SESSIONS_PER_PAGE))
  const pageSessions = filteredSessions.slice((page - 1) * SESSIONS_PER_PAGE, page * SESSIONS_PER_PAGE)

  function updateFilter(setter, value) {
    setter(value)
    setPage(1) // 필터가 바뀌면 결과 집합이 달라지므로 1페이지로 되돌린다
  }

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
            onClick={() => updateFilter(setFavoritesOnly, !favoritesOnly)}
          >
            즐겨찾기만 보기
          </button>
        </div>
        <p>지금까지 검색한 이슈를 검색 시점별로 모아봤어요.</p>

        {availableLanguages.length > 0 && (
          <div className="filterbar">
            <button
              type="button"
              className={languageFilter === ALL ? 'filter filter-active' : 'filter'}
              onClick={() => updateFilter(setLanguageFilter, ALL)}
            >
              전체 언어
            </button>
            {availableLanguages.map((language) => (
              <button
                key={language}
                type="button"
                className={languageFilter === language ? 'filter filter-active' : 'filter'}
                onClick={() => updateFilter(setLanguageFilter, language)}
              >
                {language}
              </button>
            ))}
          </div>
        )}

        {availableTopics.length > 0 && (
          <div className="filterbar">
            <button
              type="button"
              className={topicFilter === ALL ? 'filter filter-active' : 'filter'}
              onClick={() => updateFilter(setTopicFilter, ALL)}
            >
              전체 주제
            </button>
            {availableTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                className={topicFilter === topic ? 'filter filter-active' : 'filter'}
                onClick={() => updateFilter(setTopicFilter, topic)}
              >
                {TOPIC_OPTIONS.find((option) => option.value === topic)?.label ?? topic}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredSessions.length === 0 && (
        <div className="panel">
          <p className="lead">
            {sessions.length === 0 ? '아직 검색한 이슈가 없어요.' : '조건에 맞는 이슈가 없어요.'}
          </p>
        </div>
      )}

      {pageSessions.map((session) => {
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
            {session.items.map((item) => (
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

      {filteredSessions.length > SESSIONS_PER_PAGE && (
        <div className="h-pagination">
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            이전
          </button>
          <span className="h-pagination-label">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            다음
          </button>
        </div>
      )}
    </>
  )
}

export default History
