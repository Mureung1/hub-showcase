export const REVIEW_CATEGORIES = [
  'spicy',
  'value',
  'atmosphere',
  'quiet',
  'waiting',
] as const

export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number]

export const REVIEW_CATEGORY_LABELS: Record<ReviewCategory, string> = {
  spicy: '매운맛',
  value: '가성비',
  atmosphere: '분위기',
  quiet: '조용함',
  waiting: '웨이팅',
}

export const DETAIL_RATING_CATEGORIES = [
  'tasteRating',
  'valueRating',
  'atmosphereRating',
  'quietRating',
] as const

export type DetailRatingCategory = (typeof DETAIL_RATING_CATEGORIES)[number]

export const DETAIL_RATING_LABELS: Record<DetailRatingCategory, string> = {
  tasteRating: '맛',
  valueRating: '가성비',
  atmosphereRating: '분위기',
  quietRating: '조용함',
}

export type Review = {
  id: string
  kakaoPlaceId: string
  authorId: string
  authorName: string
  rating: number
  tasteRating: number | null
  valueRating: number | null
  atmosphereRating: number | null
  quietRating: number | null
  waitingMinutes: number | null
  content: string
  likedCategories: ReviewCategory[]
  createdAt: string
  tasteMatchPercent?: number
}

export type TastePriorities =
  | readonly [ReviewCategory]
  | readonly [ReviewCategory, ReviewCategory]
  | readonly [ReviewCategory, ReviewCategory, ReviewCategory]
