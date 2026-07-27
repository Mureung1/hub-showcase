import { Link } from 'react-router-dom'
import { StarIcon } from './icons.jsx'
import { DIFFICULTY_META, LANGUAGE_CLASSES, TAG_CLASSES, formatStars } from '../utils/format.js'

// 추천 목록(Result)·전체 이력(History) 공용 이슈 카드.
// onToggleFavorite이 주어질 때만 우측 상단에 즐겨찾기 버튼을 그린다(prop 없으면 버튼 자체가 없음)
function IssueCard({ item, onSelect, onToggleFavorite }) {
  const badge = DIFFICULTY_META[item.difficulty]
  const langClass = LANGUAGE_CLASSES[item.primaryLanguage] ?? ''

  return (
    <Link className="card" to="/detail" onClick={onSelect}>
      {onToggleFavorite && (
        <button
          type="button"
          className={item.isFavorited ? 'fav-btn fav-btn-on' : 'fav-btn'}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggleFavorite(item)
          }}
          aria-label={item.isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <StarIcon filled={item.isFavorited} />
        </button>
      )}
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
}

export default IssueCard
