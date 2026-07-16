import type { Review } from '../../types/review'

export type CreateReviewInput = Omit<Review, 'id' | 'createdAt'>

export interface ReviewRepository {
  getByStoreId(kakaoPlaceId: string): Review[]
  create(input: CreateReviewInput): Review
}

const STORAGE_KEY = 'tastefit:reviews'

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

  create(input) {
    const review: Review = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    writeReviews([review, ...readReviews()])
    return review
  },
}
