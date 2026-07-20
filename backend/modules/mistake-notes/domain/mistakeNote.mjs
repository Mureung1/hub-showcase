export const mistakeNoteSources = ['git-lab', 'workspace', 'algorithm', 'api-practice']
export const mistakeNoteStatuses = ['open', 'resolved']

export function createMistakeNote(input, now = new Date()) {
  const normalized = normalizeMistakeNoteInput(input)

  return {
    id: createId(now),
    ...normalized,
    createdAt: now.toISOString(),
    reviewedAt: null,
    status: 'open',
  }
}

export function normalizeMistakeNoteInput(input = {}) {
  const source = input.source
  const lessonId = normalizeString(input.lessonId)
  const lessonTitle = normalizeString(input.lessonTitle)
  const command = normalizeString(input.command)
  const reason = normalizeString(input.reason)
  const correction = normalizeString(input.correction)

  if (!mistakeNoteSources.includes(source) || !lessonId || !lessonTitle || !command || !reason || !correction) {
    throw new Error('Invalid mistake note input')
  }

  return { source, lessonId, lessonTitle, command, reason, correction }
}

export function updateMistakeNoteStatus(note, status, now = new Date()) {
  if (!mistakeNoteStatuses.includes(status)) {
    throw new Error('Invalid mistake note status')
  }

  return {
    ...note,
    status,
    reviewedAt: status === 'resolved' ? now.toISOString() : null,
  }
}

export function isOpenDuplicate(note, input) {
  return (
    note.status === 'open' &&
    note.source === input.source &&
    note.lessonId === input.lessonId &&
    note.command === input.command &&
    note.reason === input.reason
  )
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function createId(now) {
  return `mistake-${now.getTime()}-${Math.random().toString(16).slice(2)}`
}