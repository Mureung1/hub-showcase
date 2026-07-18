export interface BadgeDto { readonly id: string; readonly name: string; readonly challengeTitle: string; readonly awardedAt: string }
export interface ProfileDto { readonly displayName: string; readonly joinedAt: string; readonly badges: readonly BadgeDto[] }
export interface LearningReportDto { readonly challengeTitle: string; readonly summary: string; readonly totalMinutes: number; readonly completedDays: number; readonly longestStreak: number }
