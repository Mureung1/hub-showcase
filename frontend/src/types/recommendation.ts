export const RECOMMENDATION_SITUATIONS = [
  'study',
  'date',
  'valueMeal',
  'quickMeal',
] as const

export type RecommendationSituation =
  (typeof RECOMMENDATION_SITUATIONS)[number]

export const RECOMMENDATION_SITUATION_INFO: Record<
  RecommendationSituation,
  { emoji: string; title: string; description: string }
> = {
  study: {
    emoji: '📚',
    title: '조용히 공부할 곳',
    description: '조용함과 분위기를 중심으로 찾아요.',
  },
  date: {
    emoji: '💕',
    title: '분위기 좋은 데이트 장소',
    description: '분위기와 맛이 좋은 곳을 찾아요.',
  },
  valueMeal: {
    emoji: '💰',
    title: '가성비 좋은 식사',
    description: '가성비와 맛을 중심으로 찾아요.',
  },
  quickMeal: {
    emoji: '⚡',
    title: '기다림 적은 빠른 식사',
    description: '평균 웨이팅이 짧은 곳을 찾아요.',
  },
}

export type StoreReviewSummary = {
  kakaoPlaceId: string
  reviewCount: number
  rating: number | null
  tasteScore: number
  valueScore: number
  atmosphereScore: number
  quietScore: number
  speedScore: number
  ratingDataCount: number
}
