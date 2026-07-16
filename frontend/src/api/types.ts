export type Interest = {
  id: string
  name: string
  displayOrder: number
  launchStatus: 'active' | 'curated_only' | 'hidden' | 'preparing'
  riskLevel: 'low' | 'medium' | 'high'
  emptyStateMessage: string | null
}

export type UserInterestItem = {
  id: string
  name: string
  displayOrder: number
  launchStatus: 'active' | 'curated_only' | 'hidden' | 'preparing'
  selectable: boolean
}

export type UserInterestsResponse = {
  hasCompletedOnboarding: boolean
  interests: UserInterestItem[]
}

export type ReplaceUserInterestsResponse = {
  interestIds: string[]
}

export type InterestTag = {
  id: string
  name: string
}

export type TodayArticle = {
  id: string
  title: string
  translatedTitle: string | null
  sourceName: string
  sourceType: 'news' | 'official_blog' | 'expert_article'
  contentType: 'article' | 'blog' | 'video'
  publishedAt: string | null
  interestTags: InterestTag[]
  officialExcerpt: string | null
  translatedExcerpt: string | null
  thumbnailUrl: string | null
  readingTimeMinutes: number | null
  language: string
  accessType: 'free' | 'partial_free' | 'paywalled' | 'unknown'
  originalUrl: string
  recommendationReason: string
}

export type TodayArticlesResponse = {
  items: TodayArticle[]
  emptyStateMessage: string | null
}

export type ErrorDetail = {
  field: string
  reason: string
}

export type ErrorResponse = {
  code: string
  message: string
  details?: ErrorDetail[]
}
