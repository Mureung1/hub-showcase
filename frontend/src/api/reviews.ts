import type { CreateReviewInput } from '../features/reviews/reviewRepository'
import type { Review } from '../types/review'
import type { Store } from '../types/store'
import type { StoreReviewSummary } from '../types/recommendation'
import { getAuthSession } from './auth'

export async function getReviews(kakaoPlaceId: string): Promise<Review[]> {
  const session = getAuthSession()
  const response = await fetch(
    `/api/reviews?kakaoPlaceId=${encodeURIComponent(kakaoPlaceId)}`,
    session
      ? { headers: { Authorization: `Bearer ${session.accessToken}` } }
      : undefined,
  )
  const data = (await response.json()) as Review[] & { message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? '리뷰 목록을 불러오지 못했습니다.')
  }
  return data
}

export async function getReviewSummaries(
  kakaoPlaceIds: readonly string[],
): Promise<StoreReviewSummary[]> {
  if (kakaoPlaceIds.length === 0) return []
  const query = encodeURIComponent(kakaoPlaceIds.join(','))
  const response = await fetch(`/api/reviews/summaries?kakaoPlaceIds=${query}`)
  const data = (await response.json()) as StoreReviewSummary[] & {
    message?: string
  }
  if (!response.ok) {
    throw new Error(data.message ?? '가게 평가를 불러오지 못했습니다.')
  }
  return data
}

export async function createReview(
  input: CreateReviewInput,
  store: Store,
): Promise<Review> {
  const session = getAuthSession()
  if (!session) {
    throw new Error('리뷰를 등록하려면 먼저 로그인해 주세요.')
  }

  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      ...input,
      store: {
        kakaoPlaceId: store.id,
        name: store.name,
        category: store.category,
        phone: store.phone,
        roadAddress: store.roadAddress,
        longitude: store.longitude,
        latitude: store.latitude,
      },
    }),
  })
  const data = (await response.json()) as Review & { message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? '리뷰 등록에 실패했습니다.')
  }
  return data
}

export async function toggleReviewLike(reviewId: string) {
  const session = getAuthSession()
  if (!session) {
    throw new Error('공감하려면 먼저 로그인해 주세요.')
  }

  const response = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  const data = (await response.json()) as {
    liked: boolean
    likeCount: number
    message?: string
  }
  if (!response.ok) {
    throw new Error(data.message ?? '리뷰 공감 처리에 실패했습니다.')
  }
  return data
}
