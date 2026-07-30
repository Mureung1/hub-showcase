import { describe, expect, it } from 'vitest'
import type { TutorHistoryEntry } from './api/tutorClient'
import {
  buildTutorMistakeNoteInput,
  createTutorTranscript,
  hasCompletedTutorExchange,
  truncateForCommand,
  type TutorMessage,
} from './tutorConversation'

describe('truncateForCommand', () => {
  it('keeps short text unchanged', () => {
    expect(truncateForCommand('useState가 뭐야?')).toBe('useState가 뭐야?')
  })

  it('truncates text longer than 60 characters with an ellipsis', () => {
    const long = 'a'.repeat(70)
    const result = truncateForCommand(long)
    expect(result).toHaveLength(60)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('createTutorTranscript', () => {
  it('formats messages as Q/A lines in order', () => {
    const messages: TutorHistoryEntry[] = [
      { role: 'user', text: 'useState가 뭐야?' },
      { role: 'tutor', text: '상태를 저장하는 훅입니다.' },
    ]

    expect(createTutorTranscript(messages)).toBe(
      'Q: useState가 뭐야?\nA: 상태를 저장하는 훅입니다.',
    )
  })
})

describe('hasCompletedTutorExchange', () => {
  it('is false when there is no tutor answer yet', () => {
    expect(hasCompletedTutorExchange([{ role: 'user', text: 'useState가 뭐야?' }])).toBe(false)
  })

  it('is true once at least one tutor answer exists', () => {
    expect(
      hasCompletedTutorExchange([
        { role: 'user', text: 'useState가 뭐야?' },
        { role: 'tutor', text: '상태를 저장하는 훅입니다.' },
      ]),
    ).toBe(true)
  })
})

describe('buildTutorMistakeNoteInput', () => {
  it('maps the first question, full transcript, and last answer into mistake note fields', () => {
    const messages: TutorMessage[] = [
      { role: 'user', text: 'useState가 뭐야?' },
      { role: 'tutor', text: '상태를 저장하는 훅입니다.' },
      { role: 'error', text: '답변을 받지 못했습니다.' },
      { role: 'user', text: '그럼 useEffect는?' },
      { role: 'tutor', text: '부수 효과를 처리하는 훅입니다.' },
    ]

    expect(
      buildTutorMistakeNoteInput({ lessonId: 'generated-first-mission', lessonTitle: '상태 관리', messages }),
    ).toEqual({
      source: 'workspace',
      lessonId: 'generated-first-mission',
      lessonTitle: '상태 관리',
      command: 'useState가 뭐야?',
      reason:
        'Q: useState가 뭐야?\nA: 상태를 저장하는 훅입니다.\nQ: 그럼 useEffect는?\nA: 부수 효과를 처리하는 훅입니다.',
      correction: '부수 효과를 처리하는 훅입니다.',
    })
  })
})
