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

export type SourceType = 'news' | 'official_blog' | 'expert_article'
export type ContentType = 'article' | 'blog' | 'video'
export type AccessType = 'free' | 'partial_free' | 'paywalled' | 'unknown'
export type UrlStatus = 'active' | 'broken' | 'paywalled' | 'removed'

export type TodayArticle = {
  id: string
  title: string
  translatedTitle: string | null
  sourceName: string
  sourceType: SourceType
  contentType: ContentType
  publishedAt: string | null
  interestTags: InterestTag[]
  officialExcerpt: string | null
  translatedExcerpt: string | null
  thumbnailUrl: string | null
  readingTimeMinutes: number | null
  language: string
  accessType: AccessType
  originalUrl: string
  recommendationReason: string
}

export type TodayArticlesResponse = {
  items: TodayArticle[]
  emptyStateMessage: string | null
}

export type MissionType = 'question' | 'rebuttal' | 'connection' | 'expression'

export type MissionOption = {
  type: MissionType
  prompt: string
}

export type ArticleDetail = {
  id: string
  title: string
  translatedTitle: string | null
  sourceName: string
  sourceType: SourceType
  contentType: ContentType
  publishedAt: string | null
  author: string | null
  officialExcerpt: string | null
  translatedExcerpt: string | null
  readingTimeMinutes: number | null
  language: string
  accessType: AccessType
  urlStatus: UrlStatus
  originalUrl: string
  recommendedMission: MissionOption
  missionOptions: MissionOption[]
}

export type CreateMissionRecordRequest = {
  articleId: string
  missionType: MissionType
  userAnswer: string
}

export type MissionRecord = {
  id: string
  articleId: string
  missionType: MissionType
  missionPrompt: string
  userAnswer: string
  selectedQuote: null
  anchorType: 'whole_content'
  createdAt: string
}

export type MissionRecordListItem = {
  id: string
  articleId: string
  articleTitle: string
  sourceName: string
  interestTags: InterestTag[]
  missionType: MissionType
  missionPrompt: string
  userAnswer: string
  createdAt: string
  originalUrl: string
  urlStatus: UrlStatus
}

export type MissionRecordCalendarDay = {
  date: string
  recordCount: number
  firstMissionType: MissionType
}

export type MissionRecordCalendarResponse = {
  month: string
  days: MissionRecordCalendarDay[]
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
