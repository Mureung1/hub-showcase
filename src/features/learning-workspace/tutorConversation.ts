import type { MistakeNoteInput } from '../mistake-notes/model/useMistakeNoteStore'
import type { TutorHistoryEntry } from './api/tutorClient'

export type TutorMessage = TutorHistoryEntry | { role: 'error'; text: string }

const commandMaxLength = 60

export function truncateForCommand(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= commandMaxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, commandMaxLength - 1)}…`
}

export function createTutorTranscript(messages: TutorHistoryEntry[]): string {
  return messages.map((message) => `${message.role === 'user' ? 'Q' : 'A'}: ${message.text}`).join('\n')
}

export function hasCompletedTutorExchange(messages: TutorMessage[]): boolean {
  return messages.some((message) => message.role === 'tutor')
}

export function buildTutorMistakeNoteInput({
  lessonId,
  lessonTitle,
  messages,
}: {
  lessonId: string
  lessonTitle: string
  messages: TutorMessage[]
}): MistakeNoteInput {
  const conversation = messages.filter(
    (message): message is TutorHistoryEntry => message.role === 'user' || message.role === 'tutor',
  )
  const firstQuestion = conversation.find((message) => message.role === 'user')?.text ?? ''
  const lastAnswer = [...conversation].reverse().find((message) => message.role === 'tutor')?.text ?? ''

  return {
    source: 'workspace',
    lessonId,
    lessonTitle,
    command: truncateForCommand(firstQuestion),
    reason: createTutorTranscript(conversation),
    correction: lastAnswer,
  }
}
