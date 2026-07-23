import {
  DETAIL_RATING_CATEGORIES,
  DETAIL_RATING_LABELS,
  type Review,
} from '../types/review'
import './ReviewCard.css'

type ReviewCardProps = {
  review: Review
  showTasteMatch?: boolean
  isFeatured?: boolean
  separateAfter?: boolean
  isLikePending?: boolean
  onLike?: (reviewId: string) => void
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function ReviewCard({
  review,
  showTasteMatch = false,
  isFeatured = false,
  separateAfter = false,
  isLikePending = false,
  onLike,
}: ReviewCardProps) {
  const detailRatings = DETAIL_RATING_CATEGORIES.filter(
    (category) => review[category] !== null,
  )
  return (
    <article
      className={[
        'review-card',
        isFeatured && 'review-card--featured',
        separateAfter && 'review-card--separate-after',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="review-card__header">
        <div>
          <strong>{review.authorName}</strong>
          {review.isMine && (
            <span className="review-card__mine">내가 작성한 리뷰</span>
          )}
          <span className="review-card__rating" aria-label={`별점 ${review.rating}점`}>
            ★ {review.rating.toFixed(1)}
          </span>
        </div>

        {showTasteMatch && !review.isMine && review.tasteMatchPercent !== undefined && (
          <span className="review-card__match">
            나와 취향 {review.tasteMatchPercent}% 일치
          </span>
        )}
      </header>

      {review.content && <p className="review-card__content">{review.content}</p>}

      {detailRatings.length > 0 && (
        <ul className="review-card__categories" aria-label="세부 평가">
          {detailRatings.map((category) => (
            <li key={category}>{DETAIL_RATING_LABELS[category]} ★ {review[category]}</li>
          ))}
        </ul>
      )}

      {review.waitingMinutes !== null && (
        <p className="review-card__waiting">실제 웨이팅 {review.waitingMinutes}분</p>
      )}

      <time className="review-card__date" dateTime={review.createdAt}>
        {formatReviewDate(review.createdAt)}
      </time>

      <button
        className={`review-card__like${review.likedByMe ? ' review-card__like--active' : ''}`}
        type="button"
        aria-pressed={review.likedByMe}
        disabled={review.isMine || isLikePending || !onLike}
        title={review.isMine ? '본인이 작성한 리뷰에는 공감할 수 없습니다.' : undefined}
        onClick={() => onLike?.(review.id)}
      >
        <span aria-hidden="true">{review.likedByMe ? '♥' : '♡'}</span>
        공감 {review.likeCount}
      </button>
    </article>
  )
}

export default ReviewCard
