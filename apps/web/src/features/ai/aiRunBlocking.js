import { AI_RUN_STATUS } from '@teamflow/shared'

const STALE_RUNNING_RUN_MS = 5 * 60 * 1000

export function isAiRunBlocking(run, now = Date.now()) {
  if ([AI_RUN_STATUS.PENDING_REVIEW, AI_RUN_STATUS.APPLIED].includes(run?.status)) {
    return true
  }
  if (run?.status !== AI_RUN_STATUS.RUNNING) return false

  const lastChangedAt = [run.updatedAt, run.createdAt]
    .map((value) => Date.parse(value))
    .find((value) => Number.isFinite(value))

  if (!Number.isFinite(lastChangedAt) || !Number.isFinite(now)) return true
  return now - lastChangedAt < STALE_RUNNING_RUN_MS
}
