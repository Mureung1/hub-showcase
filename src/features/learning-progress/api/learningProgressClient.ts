import { apiUrl } from '../../../app/apiUrl'
import type { LearningMissionProgress, LearningRunState, LearningTestResult } from '../model/useLearningProgressStore'

export type LearningProgressResponse = {
  missions: Record<string, LearningMissionProgress>
}

export type SaveLearningProgressRequest = {
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  completedAt?: string | null
  activityLog: LearningMissionProgress['activityLog']
  lastTestResult?: LearningTestResult | null
}

export type SaveLearningProgressResponse = {
  progress: LearningMissionProgress
}

export const todayProgressEndpoint = '/api/progress/today'
export const allProgressEndpoint = '/api/progress'

export function missionProgressEndpoint(missionId: string) {
  return `/api/progress/missions/${encodeURIComponent(missionId)}`
}

export async function getTodayProgress(fetchImpl: typeof fetch = fetch): Promise<LearningProgressResponse> {
  const response = await fetchImpl(apiUrl(todayProgressEndpoint))
  if (!response.ok) throw new Error(`Today progress request failed (${response.status})`)

  return (await response.json()) as LearningProgressResponse
}

export async function saveMissionProgress(
  missionId: string,
  request: SaveLearningProgressRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<SaveLearningProgressResponse> {
  const response = await fetchImpl(apiUrl(missionProgressEndpoint(missionId)), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(`Save mission progress failed (${response.status})`)

  return (await response.json()) as SaveLearningProgressResponse
}

export async function deleteMissionProgress(missionId: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(apiUrl(missionProgressEndpoint(missionId)), { method: 'DELETE' })
  if (!response.ok) throw new Error(`Delete mission progress failed (${response.status})`)
}

export async function resetAllLearningProgress(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(apiUrl(allProgressEndpoint), { method: 'DELETE' })
  if (!response.ok) throw new Error(`Reset learning progress failed (${response.status})`)
}
