import { Link } from 'react-router-dom'
import Thumbnail from './Thumbnail'

// 홈 화면의 카테고리 카드와 카테고리 상세 화면의 레시피 카드가 똑같은 모양이라
// 하나의 컴포넌트로 합쳐서 씀 (순위 배지는 rank가 있을 때만, 가격 뒤 문구는 priceSuffix로 다르게).
function MenuCard({
  to,
  rank,
  image,
  emoji,
  name,
  price,
  priceSuffix = '원',
  bestTag = false,
  missingCount = 0,
  timeLabel = '',
  width = '',
  liked,
  onToggleLike,
}) {
  return (
    <li className={width}>
      <Link
        to={to}
        className="relative flex flex-col overflow-hidden rounded-card border-2 border-ink bg-bg-surface transition hover:-translate-y-[2px]"
      >
        {rank && (
          <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-bg-surface/90 text-xs font-semibold text-primary-text shadow">
            {rank}
          </span>
        )}
        {onToggleLike && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onToggleLike()
            }}
            aria-label={liked ? '찜 해제' : '찜하기'}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-surface/90 text-base shadow transition hover:scale-110"
          >
            <span className={liked ? 'text-accent-heart' : 'text-text-secondary'}>{liked ? '★' : '☆'}</span>
          </button>
        )}
        <Thumbnail image={image} emoji={emoji} alt={name} className="aspect-video w-full text-4xl" />
        <div className="p-3">
          <p className="truncate font-display text-base font-bold text-text-primary">{name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <p className="font-display text-xl font-bold text-primary-text">
              {price.toLocaleString()}
              {priceSuffix}
            </p>
            {bestTag && (
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 font-display text-xs font-bold text-primary-text">
                최저가
              </span>
            )}
            {missingCount > 0 && (
              <span className="rounded-md bg-bg-muted px-1.5 py-0.5 font-display text-xs font-bold text-text-secondary">
                {missingCount}개만 더 있으면
              </span>
            )}
            {timeLabel && (
              <span className="rounded-md bg-bg-muted px-1.5 py-0.5 font-display text-xs font-bold text-text-secondary">
                {timeLabel}
              </span>
            )}
            <span className="ml-auto text-sm text-text-secondary opacity-45" aria-hidden="true">
              🕐
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

export default MenuCard
