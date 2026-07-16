import { useState, type FormEvent } from 'react'
import {
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_LABELS,
  type ReviewCategory,
} from '../types/review'
import type { CreateReviewInput } from '../features/reviews/reviewRepository'
import './ReviewForm.css'

type ReviewFormProps = {
  kakaoPlaceId: string
  authorId?: string
  authorName?: string
  onSubmit: (review: CreateReviewInput) => void
}

const MIN_CONTENT_LENGTH = 10
const MAX_CONTENT_LENGTH = 500

function ReviewForm({
  kakaoPlaceId,
  authorId = 'temporary-user',
  authorName = '세원',
  onSubmit,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [likedCategories, setLikedCategories] = useState<ReviewCategory[]>([])
  const trimmedContentLength = content.trim().length
  const canSubmit =
    rating >= 1 &&
    rating <= 5 &&
    trimmedContentLength >= MIN_CONTENT_LENGTH &&
    content.length <= MAX_CONTENT_LENGTH

  const toggleCategory = (category: ReviewCategory) => {
    setLikedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    onSubmit({
      kakaoPlaceId,
      authorId,
      authorName,
      rating,
      content: content.trim(),
      likedCategories,
    })
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <fieldset className="review-form__group">
        <legend>별점</legend>
        <div className="review-form__ratings" aria-label="별점 선택">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              className={value <= rating ? 'review-form__star--active' : ''}
              type="button"
              key={value}
              aria-label={`${value}점`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="review-form__group">
        <legend>어떤 점이 좋았나요? <small>선택하지 않아도 돼요</small></legend>
        <div className="review-form__categories">
          {REVIEW_CATEGORIES.map((category) => {
            const isSelected = likedCategories.includes(category)
            return (
              <button
                type="button"
                key={category}
                aria-pressed={isSelected}
                onClick={() => toggleCategory(category)}
              >
                {REVIEW_CATEGORY_LABELS[category]}
              </button>
            )
          })}
        </div>
      </fieldset>

      <label className="review-form__content">
        <span>리뷰 내용</span>
        <textarea
          value={content}
          maxLength={MAX_CONTENT_LENGTH}
          placeholder="가게에 대한 솔직한 경험을 10자 이상 작성해 주세요."
          onChange={(event) => setContent(event.target.value)}
        />
        <small className={trimmedContentLength > 0 && trimmedContentLength < MIN_CONTENT_LENGTH ? 'review-form__count--error' : ''}>
          {content.length}/{MAX_CONTENT_LENGTH}
        </small>
      </label>

      <button className="review-form__submit" type="submit" disabled={!canSubmit}>
        등록
      </button>
    </form>
  )
}

export default ReviewForm
