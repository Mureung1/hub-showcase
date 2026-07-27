import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getRecommendationHistory, addFavorite, removeFavorite } from '../api/index.js'
import IssueCard from './IssueCard.jsx'

const ALL = 'all'
const ITEMS_PER_PAGE = 5

// 8 · 전체 검색 이력 — 스텝퍼 흐름 밖 부가 화면. 지금까지 검색한 모든 이슈를 최신순 평탄화 목록으로
// 보여주고(Recommendation은 삭제 없이 계속 쌓이는 설계라 즐겨찾기 안 한 이슈도 항상 여기서 볼 수 있다),
// 언어/즐겨찾기 필터, 정렬(최신순/점수순), 페이지네이션(카드 5장 = 1페이지)은 전부 이미 받아온 응답을
// 프론트에서 처리한다(별도 API 없음). 필터는 언어 하나만 둔다 — 주제까지 더하니 복잡해진다는 피드백으로
// 단순화했다(2026-07-27)
function History() {
  const { githubId, setRecommendation, setSelectedItem } = useOutletContext()
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [languageFilter, setLanguageFilter] = useState(ALL)
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'score'
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

  // 같은 이슈가 여러 세션에 걸쳐 반복 추천되는 경우(다양화가 새 이슈 부족 시 예전 이슈로 채우는 폴백,
  // 또는 그냥 여러 번 검색해서 겹치는 경우)가 많아 세션마다 그대로 보여주면 중복이 심하다.
  // 세션이 이미 최신순으로 오므로, 한 번 등장한 (repoFullName#issueNumber)는 그 이후(더 오래된) 세션에서는 숨긴다
  const dedupedSessions = useMemo(() => {
    if (!sessions) return []
    const seenKeys = new Set()
    return sessions
      .map((session) => ({
        ...session,
        items: session.items.filter((item) => {
          const key = `${item.repoFullName}#${item.issueNumber}`
          if (seenKeys.has(key)) return false
          seenKeys.add(key)
          return true
        }),
      }))
      .filter((session) => session.items.length > 0)
  }, [sessions])

  // 세션 그룹 대신 이슈 카드 단위로 평탄화한다 — "5개를 한 페이지로"는 세션이 아니라 카드 5장 기준이라,
  // 세션 경계와 페이지 경계가 어긋날 수 있다(한 세션의 카드 일부만 이번 페이지에 걸치는 것도 정상).
  // 카드마다 어느 세션(조건) 소속인지는 select 시 recommendation으로 세팅해야 해서 함께 들고 있는다
  const filteredItems = useMemo(() => {
    return dedupedSessions
      .flatMap((session) => session.items.map((item) => ({ item, session })))
      .filter(
        ({ item }) =>
          (!favoritesOnly || item.isFavorited) && (languageFilter === ALL || item.primaryLanguage === languageFilter),
      )
  }, [dedupedSessions, favoritesOnly, languageFilter])

  // 기본은 세션(검색 시점) 최신순 그대로 — 정렬을 바꾸고 싶을 때만 매칭 점수 내림차순으로 다시 정렬한다.
  // filteredItems 자체를 안 건드리고 여기서만 정렬하는 이유: 필터 선택지 계산 등 다른 곳은 원래 순서(최신순)를
  // 기준으로 해도 무방해서, "정렬"은 오직 화면에 보여줄 목록 순서에만 영향을 주는 게 맞다
  const sortedItems = useMemo(() => {
    if (sortBy !== 'score') return filteredItems
    return [...filteredItems].sort((a, b) => b.item.matchScore - a.item.matchScore)
  }, [filteredItems, sortBy])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE))
  // 즐겨찾기 해제 등으로 sortedItems가 줄어들면 totalPages도 줄어드는데, page state는 그대로 남아있어
  // "존재하지 않는 페이지"를 가리킬 수 있었다(빈 화면 + 못 돌아옴, 2026-07-27 코드리뷰) — 매번 유효 범위로
  // 보정해서 쓴다. setPage로 state 자체를 리셋하지 않는 이유: 렌더 도중 setState를 부르면 추가 렌더가
  // 생기니, 파생값 계산만으로 끝내는 쪽이 더 단순하다
  const safePage = Math.min(page, totalPages)
  const pageItems = sortedItems.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  function updateFilter(setter, value) {
    setter(value)
    setPage(1) // 필터가 바뀌면 결과 집합이 달라지므로 1페이지로 되돌린다
  }

  const [favoriteError, setFavoriteError] = useState(null)

  // 성공 후에만 다시 불러온다(낙관적 업데이트 없음) — Result.jsx의 handleToggleFavorite와 같은 방식.
  // IssueCard가 이 함수를 await 없이 호출하므로, 실패를 여기서 안 잡으면 unhandled rejection으로
  // 조용히 묻히고 별만 안 바뀐 채 아무 안내도 없었다(2026-07-27 코드리뷰 발견)
  async function handleToggleFavorite(item) {
    try {
      if (item.isFavorited) {
        await removeFavorite(githubId, item.repoFullName, item.issueNumber)
      } else {
        await addFavorite(githubId, item.repoFullName, item.issueNumber)
      }
    } catch (error) {
      setFavoriteError(error)
      return
    }
    setFavoriteError(null)
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
        <p>지금까지 검색한 이슈를 모아봤어요.</p>

        {availableLanguages.length > 0 && (
          <div className="filterbar">
            <button
              type="button"
              className={languageFilter === ALL ? 'filter filter-active' : 'filter'}
              onClick={() => updateFilter(setLanguageFilter, ALL)}
            >
              전체
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

        <div className="filterbar">
          <button
            type="button"
            className={sortBy === 'recent' ? 'filter filter-active' : 'filter'}
            onClick={() => updateFilter(setSortBy, 'recent')}
          >
            최신순
          </button>
          <button
            type="button"
            className={sortBy === 'score' ? 'filter filter-active' : 'filter'}
            onClick={() => updateFilter(setSortBy, 'score')}
          >
            점수순
          </button>
        </div>
      </div>

      {favoriteError && <p className="r-refetch-error">{favoriteError.message}</p>}

      {sortedItems.length === 0 && (
        <div className="panel">
          <p className="lead">
            {sessions.length === 0 ? '아직 검색한 이슈가 없어요.' : '조건에 맞는 이슈가 없어요.'}
          </p>
        </div>
      )}

      {pageItems.map(({ item, session }) => (
        <IssueCard
          key={item.issueUrl}
          item={item}
          onSelect={() => handleSelect(session, item)}
          onToggleFavorite={handleToggleFavorite}
        />
      ))}

      {sortedItems.length > ITEMS_PER_PAGE && (
        <div className="h-pagination">
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
          >
            이전
          </button>
          <span className="h-pagination-label">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
          >
            다음
          </button>
        </div>
      )}
    </>
  )
}

export default History
