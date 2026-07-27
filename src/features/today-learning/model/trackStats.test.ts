import { describe, expect, it } from 'vitest'
import type { MistakeNote } from '../../mistake-notes/model/useMistakeNoteStore'
import { formatTestResultLabel, findTopWeakConcept, getTrackStatus } from './trackStats'

function createMistakeNote(overrides: Partial<MistakeNote>): MistakeNote {
  return {
    id: 'note-1',
    source: 'workspace',
    lessonId: 'lesson-1',
    lessonTitle: 'state 업데이트',
    command: 'npm test',
    reason: '오답',
    correction: '정정',
    createdAt: '2026-07-20T09:00:00.000Z',
    reviewedAt: null,
    status: 'open',
    ...overrides,
  }
}

describe('trackStats', () => {
  it('classifies track status from a percent value', () => {
    expect(getTrackStatus(null)).toBe('unavailable')
    expect(getTrackStatus(0)).toBe('not_started')
    expect(getTrackStatus(45)).toBe('in_progress')
    expect(getTrackStatus(100)).toBe('completed')
  })

  it('formats a test result label', () => {
    expect(formatTestResultLabel(null)).toBe('아직 실행 안함')
    expect(formatTestResultLabel({ passed: 2, total: 3, ranAt: '2026-07-20T09:00:00.000Z' })).toBe('2 / 3')
  })

  it('finds the most frequent open lessonTitle across mistake notes', () => {
    const notes = [
      createMistakeNote({ id: 'a', lessonTitle: 'state 업데이트' }),
      createMistakeNote({ id: 'b', lessonTitle: 'state 업데이트' }),
      createMistakeNote({ id: 'c', lessonTitle: '이벤트 핸들러' }),
      createMistakeNote({ id: 'd', lessonTitle: '해결됨', status: 'resolved' }),
    ]

    expect(findTopWeakConcept(notes)).toBe('state 업데이트')
  })

  it('returns null when there are no open mistake notes', () => {
    expect(findTopWeakConcept([createMistakeNote({ status: 'resolved' })])).toBeNull()
  })
})
