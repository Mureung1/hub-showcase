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

export type Review = {
  id: string
  kakaoPlaceId: string
  authorId: string
  authorName: string
  rating: number
  content: string
  likedCategories: ReviewCategory[]
  createdAt: string
  tasteMatchPercent?: number
}

export type TastePriorities = readonly [
  ReviewCategory,
  ReviewCategory,
  ReviewCategory,
]
