import { describe, expect, it } from 'vitest'
import type { MistakeNote } from './useMistakeNoteStore'
import {
  emptyMistakeNoteForm,
  normalizeMistakeNoteForm,
  toMistakeNoteForm,
  validateMistakeNoteForm,
} from './mistakeNoteForm'

const note: MistakeNote = {
  id: 'note-1',
  source: 'workspace',
  lessonTitle: 'HTTP 실습',
  lessonId: 'mission-1',
  command: 'npm test',
  reason: '상태 코드가 다릅니다.',
  correction: '응답 코드를 수정합니다.',
  createdAt: '2026-07-28T08:00:00.000Z',
  reviewedAt: '2026-07-28T09:00:00.000Z',
  status: 'resolved',
}

describe('mistakeNoteForm', () => {
  it('copies only editable content from a note', () => {
    expect(toMistakeNoteForm(note)).toEqual({
      source: 'workspace',
      lessonTitle: 'HTTP 실습',
      lessonId: 'mission-1',
      command: 'npm test',
      reason: '상태 코드가 다릅니다.',
      correction: '응답 코드를 수정합니다.',
    })
  })

  it('trims every text field', () => {
    expect(
      normalizeMistakeNoteForm({
        ...toMistakeNoteForm(note),
        lessonTitle: ' HTTP 실습 ',
        lessonId: ' mission-1 ',
        command: ' npm test ',
        reason: ' 실패 ',
        correction: ' 수정 ',
      }),
    ).toMatchObject({
      lessonTitle: 'HTTP 실습',
      lessonId: 'mission-1',
      command: 'npm test',
      reason: '실패',
      correction: '수정',
    })
  })

  it('returns the first missing-field error with the source-specific command label', () => {
    expect(validateMistakeNoteForm(emptyMistakeNoteForm)).toBe('레슨 이름을 입력해 주세요.')
    expect(
      validateMistakeNoteForm({
        ...toMistakeNoteForm(note),
        source: 'algorithm',
        command: ' ',
      }),
    ).toBe('틀린 풀이 요약을(를) 입력해 주세요.')
  })
})
