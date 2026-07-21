import { useState, type FormEvent } from 'react'
import {
  DETAIL_RATING_CATEGORIES,
  DETAIL_RATING_LABELS,
  type DetailRatingCategory,
} from '../types/review'
import type { CreateReviewInput } from '../features/reviews/reviewRepository'
import './ReviewForm.css'

type ReviewFormProps = {
  kakaoPlaceId: string
  onSubmit: (review: CreateReviewInput) => Promise<void>
}

const MAX_CONTENT_LENGTH = 500

function ReviewForm({
  kakaoPlaceId,
  onSubmit,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [activeCategory, setActiveCategory] = useState<DetailRatingCategory | null>(null)
  const [categoryRatings, setCategoryRatings] = useState<
    Record<DetailRatingCategory, number | null>
  >({
    tasteRating: null,
    valueRating: null,
    atmosphereRating: null,
    quietRating: null,
  })
  const [waitingMinutes, setWaitingMinutes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const parsedWaitingMinutes = waitingMinutes === '' ? null : Number(waitingMinutes)
  const isWaitingTimeValid =
    parsedWaitingMinutes === null ||
    (Number.isInteger(parsedWaitingMinutes) &&
      parsedWaitingMinutes >= 0 &&
      parsedWaitingMinutes <= 300)
  const canSubmit =
    rating >= 1 &&
    rating <= 5 &&
    content.length <= MAX_CONTENT_LENGTH &&
    isWaitingTimeValid

  const toggleCategory = (category: DetailRatingCategory) => {
    setActiveCategory((current) => (current === category ? null : category))
  }

  const setCategoryRating = (category: DetailRatingCategory, value: number) => {
    setCategoryRatings((current) => ({ ...current, [category]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await onSubmit({
        kakaoPlaceId,
        rating,
        content: content.trim(),
        ...categoryRatings,
        waitingMinutes: parsedWaitingMinutes,
      })
    } catch (reason) {
      setSubmitError(
        reason instanceof Error ? reason.message : '리뷰 등록에 실패했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
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
        <legend>세부 평가 <small>평가할 항목만 선택해 주세요</small></legend>
        <div className="review-form__categories">
          {DETAIL_RATING_CATEGORIES.map((category) => {
            const isSelected = categoryRatings[category] !== null
            return (
              <button
                type="button"
                key={category}
                aria-pressed={isSelected}
                onClick={() => toggleCategory(category)}
              >
                {DETAIL_RATING_LABELS[category]}
                {isSelected && ` ${categoryRatings[category]}점`}
              </button>
            )
          })}
        </div>

        {activeCategory && (
          <div className="review-form__detail-rating" aria-live="polite">
            <strong>{DETAIL_RATING_LABELS[activeCategory]} 별점</strong>
            <div className="review-form__ratings" aria-label={`${DETAIL_RATING_LABELS[activeCategory]} 별점 선택`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  className={value <= (categoryRatings[activeCategory] ?? 0) ? 'review-form__star--active' : ''}
                  type="button"
                  key={value}
                  aria-label={`${value}점`}
                  aria-pressed={categoryRatings[activeCategory] === value}
                  onClick={() => setCategoryRating(activeCategory, value)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <label className="review-form__waiting">
        <span>실제 웨이팅 시간 <small>선택사항</small></span>
        <span className="review-form__waiting-input">
          <input
            type="number"
            min="0"
            max="300"
            step="5"
            inputMode="numeric"
            value={waitingMinutes}
            placeholder="0"
            aria-describedby="waiting-time-help"
            onChange={(event) => setWaitingMinutes(event.target.value)}
          />
          <strong>분</strong>
        </span>
        <small id="waiting-time-help">기다리지 않았다면 0분을 입력해 주세요.</small>
        {!isWaitingTimeValid && (
          <small className="review-form__count--error" role="alert">
            웨이팅 시간은 0~300분 정수로 입력해 주세요.
          </small>
        )}
      </label>

      <label className="review-form__content">
        <span>리뷰 내용</span>
        <textarea
          value={content}
          maxLength={MAX_CONTENT_LENGTH}
          placeholder="리뷰 내용은 선택사항입니다."
          onChange={(event) => setContent(event.target.value)}
        />
        <small>
          {content.length}/{MAX_CONTENT_LENGTH}
        </small>
      </label>

      {submitError && <p className="review-form__error" role="alert">{submitError}</p>}

      <button className="review-form__submit" type="submit" disabled={!canSubmit || isSubmitting}>
        {isSubmitting ? '등록 중...' : '등록'}
      </button>
    </form>
  )
}

export default ReviewForm
