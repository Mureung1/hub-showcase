export interface DailyGoalInput { readonly participationId: string; readonly date: string; readonly goal: string }
export interface TimerSessionInput { readonly participationId: string; readonly date: string; readonly elapsedSeconds: number; readonly clientSessionId: string }
export interface VerificationInput { readonly participationId: string; readonly date: string; readonly retrospective: string; readonly evidencePath: string }
export interface DailyProgressDto { readonly date: string; readonly goal: string | null; readonly confirmedSeconds: number; readonly requiredSeconds: number; readonly verification: 'pending' | 'complete' | 'failed' }
export interface VerificationStatusDto { readonly status: 'complete' | 'pending'; readonly completedAt: string | null }
export interface StudyWorkspaceDto { readonly participationId: string; readonly challengeId: string; readonly challengeTitle: string; readonly localDate: string; readonly survivalStatus: 'alive' | 'eliminated' | 'completed'; readonly deadlineAt: string; readonly progress: DailyProgressDto }
export interface ProgressDto { readonly completedDays: number; readonly totalDays: number; readonly streak: number; readonly survivalStatus: 'alive' | 'eliminated' | 'completed' }
export interface LeaderboardEntryDto { readonly rank: number; readonly displayName: string; readonly streak: number; readonly status: 'alive' | 'eliminated' | 'completed'; readonly isViewer: boolean }
export interface LeaderboardDto { readonly challengeId: string; readonly aliveCount: number; readonly entries: readonly LeaderboardEntryDto[] }
export interface SurpriseMissionDto { readonly id: string; readonly title: string; readonly description: string; readonly endsAt: string }
