import { Navigate, useOutletContext } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createRecommendation, addFavorite, removeFavorite } from '../api/index.js'
import { RefreshIcon } from './icons.jsx'
import IssueCard from './IssueCard.jsx'
import { DIFFICULTY_META } from '../utils/format.js'
import { TOPIC_OPTIONS } from '../utils/preferences.js'

// 5 · 추천 결과 목록
function Result() {
  const { recommendation, setRecommendation, setSelectedItem } = useOutletContext()

  // 지금 화면에 보이는 목록을 만든 바로 그 조건으로 재요청 — 재추천 다양화(새 이슈 우선, 하루 상한)는 백엔드가 처리
  const { mutate: refetch, isPending: isRefetching, error: refetchError } = useMutation({
    mutationFn: () => createRecommendation(recommendation?.githubId, recommendation?.preferences),
    onSuccess: (next) => setRecommendation(next),
  })

  // 즐겨찾기 토글 — API 성공 후에만 화면 상태(recommendation.items)를 갱신한다(낙관적 업데이트 없음)
  async function handleToggleFavorite(item) {
    const { githubId } = recommendation
    if (item.isFavorited) {
      await removeFavorite(githubId, item.repoFullName, item.issueNumber)
    } else {
      await addFavorite(githubId, item.repoFullName, item.issueNumber)
    }
    setRecommendation({
      ...recommendation,
      items: recommendation.items.map((existing) =>
        existing.repoFullName === item.repoFullName && existing.issueNumber === item.issueNumber
          ? { ...existing, isFavorited: !existing.isFavorited }
          : existing,
      ),
    })
  }

  if (!recommendation) {
    return <Navigate to="/input" replace />
  }

  const { preferences, items } = recommendation
  const filters = [
    '전체',
    ...preferences.languages,
    DIFFICULTY_META[preferences.difficulty].label,
    ...preferences.topics.map(
      (value) => TOPIC_OPTIONS.find((topic) => topic.value === value)?.label ?? value,
    ),
  ]

  return (
    <>
      <div className="r-head">
        <div className="r-head-row">
          <h1>이런 이슈는 어때요?</h1>
          <button
            type="button"
            className="btn btn-soft r-refetch-btn"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshIcon className={isRefetching ? 'r-refetch-icon spin' : 'r-refetch-icon'} />
            재검색
          </button>
        </div>
        <p>
          딱 맞는 이슈 <span className="accent">{items.length}개</span>를 찾았어요. 이슈를 눌러
          자세히 확인해보세요.
        </p>
        <div className="filterbar">
          {filters.map((filter, index) => (
            <span key={filter} className={index === 0 ? 'filter filter-active' : 'filter'}>
              {filter}
            </span>
          ))}
        </div>
      </div>

      {refetchError && <p className="r-refetch-error">{refetchError.message}</p>}

      {isRefetching && (
        <div className="panel">
          <h1 className="a-title">
            <span className="spinner" />
            재검색하고 있어요
          </h1>
          <p className="a-lead">같은 조건에서, 아직 못 본 이슈 위주로 다시 찾는 중이에요.</p>
        </div>
      )}

      {!isRefetching && items.length === 0 && (
        <div className="panel">
          <p className="lead">
            조건에 맞는 이슈를 찾지 못했어요.
            <br />
            난이도나 분야를 완화해 다시 찾아보세요.
          </p>
        </div>
      )}

      {!isRefetching && items.map((item) => (
        <IssueCard
          key={item.issueUrl}
          item={item}
          onSelect={() => setSelectedItem(item)}
          onToggleFavorite={handleToggleFavorite}
        />
      ))}

      <p className="foot-note">조건에 맞는 결과가 부족하면 난이도·분야를 완화해 다시 찾아드려요</p>
    </>
  )
}

export default Result
