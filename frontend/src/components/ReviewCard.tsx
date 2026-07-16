import {
  REVIEW_CATEGORY_LABELS,
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

      <p className="review-card__content">{review.content}</p>

      {review.likedCategories.length > 0 && (
        <ul className="review-card__categories" aria-label="좋았던 점">
          {review.likedCategories.map((category) => (
            <li key={category}>{REVIEW_CATEGORY_LABELS[category]}</li>
          ))}
        </ul>
      )}

      <time className="review-card__date" dateTime={review.createdAt}>
        {formatReviewDate(review.createdAt)}
      </time>
    </article>
  )
}

export default ReviewCard
