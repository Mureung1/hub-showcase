export const gitLabAttemptResults = ['passed', 'failed']

export function createGitLabAttempt(input = {}, now = new Date()) {
  const lessonId = normalizeString(input.lessonId)
  const command = normalizeString(input.command)
  const result = input.result

  if (!lessonId || !command || !gitLabAttemptResults.includes(result)) {
    throw new Error('Invalid Git Lab attempt input')
  }

  return {
    id: `git-attempt-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    lessonId,
    command,
    result,
    reason: normalizeString(input.reason),
    createdAt: now.toISOString(),
  }
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}