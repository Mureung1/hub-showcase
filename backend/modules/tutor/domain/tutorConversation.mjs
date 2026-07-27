export function normalizeTutorRequest(input) {
  const question = typeof input?.question === 'string' ? input.question.trim() : ''
  if (!question) {
    throw new Error('Tutor question is required')
  }

  return {
    question,
    code: typeof input?.code === 'string' ? input.code : '',
    fileName: typeof input?.fileName === 'string' ? input.fileName.trim() : '',
    missionTitle: typeof input?.missionTitle === 'string' ? input.missionTitle.trim() : '',
    missionDetail: typeof input?.missionDetail === 'string' ? input.missionDetail.trim() : '',
    history: normalizeHistory(input?.history),
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return []
  }

  return history.filter(isValidHistoryEntry).map((entry) => ({
    role: entry.role,
    text: entry.text.trim(),
  }))
}

function isValidHistoryEntry(entry) {
  return (
    Boolean(entry) &&
    (entry.role === 'user' || entry.role === 'tutor') &&
    typeof entry.text === 'string' &&
    entry.text.trim().length > 0
  )
}
