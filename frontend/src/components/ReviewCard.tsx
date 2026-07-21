import {
  DETAIL_RATING_CATEGORIES,
  DETAIL_RATING_LABELS,
  type Review,
} from '../types/review'
import './ReviewCard.css'

type ReviewCardProps = {
  review: Review
  showTasteMatch?: boolean
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function ReviewCard({ review, showTasteMatch = false }: ReviewCardProps) {
  const detailRatings = DETAIL_RATING_CATEGORIES.filter(
    (category) => review[category] !== null,
  )
  return (
    <article className="review-card">
      <header className="review-card__header">
        <div>
          <strong>{review.authorName}</strong>
          <span className="review-card__rating" aria-label={`별점 ${review.rating}점`}>
            ★ {review.rating.toFixed(1)}
          </span>
        </div>

        {showTasteMatch && review.tasteMatchPercent !== undefined && (
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
    </article>
  )
}

export default ReviewCard
