import type { Review } from '../../types/review'

export type CreateReviewInput = Pick<
  Review,
  | 'kakaoPlaceId'
  | 'rating'
  | 'tasteRating'
  | 'valueRating'
  | 'atmosphereRating'
  | 'quietRating'
  | 'waitingMinutes'
  | 'content'
>

export type ReviewSummary = {
  rating: number | null
  reviewCount: number
}

export interface ReviewRepository {
  getByStoreId(kakaoPlaceId: string): Review[]
  getSummaries(kakaoPlaceIds: readonly string[]): Map<string, ReviewSummary>
  create(input: CreateReviewInput): Review
  save(review: Review): Review
  subscribe(listener: () => void): () => void
}

const STORAGE_KEY = 'tastefit:reviews'
const REVIEWS_CHANGED_EVENT = 'tastefit:reviews-changed'

function readReviews(): Review[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as Review[]) : []
  } catch {
    return []
  }
}

function writeReviews(reviews: Review[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
}

export const localReviewRepository: ReviewRepository = {
  getByStoreId(kakaoPlaceId) {
    return readReviews()
      .filter((review) => review.kakaoPlaceId === kakaoPlaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  getSummaries(kakaoPlaceIds) {
    const targetIds = new Set(kakaoPlaceIds)
    const totals = new Map<string, { ratingSum: number; reviewCount: number }>()

    readReviews().forEach((review) => {
      if (!targetIds.has(review.kakaoPlaceId)) return

      const current = totals.get(review.kakaoPlaceId) ?? {
        ratingSum: 0,
        reviewCount: 0,
      }
      current.ratingSum += review.rating
      current.reviewCount += 1
      totals.set(review.kakaoPlaceId, current)
    })

    return new Map(
      kakaoPlaceIds.map((kakaoPlaceId) => {
        const total = totals.get(kakaoPlaceId)
        return [
          kakaoPlaceId,
          {
            rating: total ? total.ratingSum / total.reviewCount : null,
            reviewCount: total?.reviewCount ?? 0,
          },
        ]
      }),
    )
  },

  create(input) {
    const review: Review = {
      ...input,
      authorId: '',
      authorName: '사용자',
      likedCategories: [],
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    writeReviews([review, ...readReviews()])
    window.dispatchEvent(new Event(REVIEWS_CHANGED_EVENT))
    return review
  },

  save(review) {
    writeReviews([review, ...readReviews().filter((item) => item.id !== review.id)])
    window.dispatchEvent(new Event(REVIEWS_CHANGED_EVENT))
    return review
  },

  subscribe(listener) {
    window.addEventListener(REVIEWS_CHANGED_EVENT, listener)
    window.addEventListener('storage', listener)

    return () => {
      window.removeEventListener(REVIEWS_CHANGED_EVENT, listener)
      window.removeEventListener('storage', listener)
    }
  },
}
