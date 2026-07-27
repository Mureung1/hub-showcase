import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createRecommendation } from '../api/index.js'
import { RefreshIcon } from './icons.jsx'
import { DIFFICULTY_META, LANGUAGE_CLASSES, TAG_CLASSES, formatStars } from '../utils/format.js'
import { TOPIC_OPTIONS } from '../utils/preferences.js'

const LIMIT_EXCEEDED_MESSAGE = '오늘 재추천 횟수를 다 사용했어요. 내일 다시 시도해주세요.'

// 5 · 추천 결과 목록
function Result() {
  const { recommendation, setRecommendation, setSelectedItem } = useOutletContext()

  // 지금 화면에 보이는 목록을 만든 바로 그 조건으로 재요청 — 재추천 다양화(새 이슈 우선, 하루 상한)는 백엔드가 처리
  const { mutate: refetch, isPending: isRefetching, error: refetchError } = useMutation({
    mutationFn: () => createRecommendation(recommendation?.githubId, recommendation?.preferences),
    onSuccess: (next) => setRecommendation(next),
  })

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

      {refetchError && (
        <p className="r-refetch-error">
          {refetchError.code === 'RECOMMENDATION_LIMIT_EXCEEDED'
            ? LIMIT_EXCEEDED_MESSAGE
            : refetchError.message}
        </p>
      )}

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

      {!isRefetching && items.map((item) => {
        const badge = DIFFICULTY_META[item.difficulty]
        const langClass = LANGUAGE_CLASSES[item.primaryLanguage] ?? ''
        return (
          <Link
            className="card"
            to="/detail"
            key={item.issueUrl}
            onClick={() => setSelectedItem(item)}
          >
            <div className="card-top">
              <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
              <span className="repo">
                <span className={`lang ${langClass}`}>
                  <span className="sw" />
                  {item.primaryLanguage}
                </span>{' '}
                · <b>{item.repoFullName}</b> <span className="inum">#{item.issueNumber}</span> ·{' '}
                <span className="star">★</span> {formatStars(item.repoStars)}
              </span>
            </div>
            <h2 className="i-title">{item.issueTitle}</h2>
            <div className="tags">
              {item.labels.map((label) => (
                <span key={label} className={TAG_CLASSES[label] ? `tag ${TAG_CLASSES[label]}` : 'tag'}>
                  {label}
                </span>
              ))}
            </div>
            <div className="why">
              <span className="ic">↣</span>
              <div>
                <b>매칭 점수 {item.matchScore}점</b> · {item.reason}
              </div>
            </div>
          </Link>
        )
      })}

      <p className="foot-note">조건에 맞는 결과가 부족하면 난이도·분야를 완화해 다시 찾아드려요</p>
    </>
  )
}

export default Result
