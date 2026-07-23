import { describe, expect, it } from 'vitest'
import type { MistakeNote } from './model/useMistakeNoteStore'
import { createMistakeReviewPath, getMistakeNoteSourceLabel } from './mistakeNoteRoutes'



const baseNote: Pick<MistakeNote, 'source' | 'lessonId'> = {
  source: 'git-lab',
  lessonId: '1-2',
}


describe('mistakeNoteRoutes', () => {
  it('creates a Git Lab review path', () => {
    expect(createMistakeReviewPath(baseNote)).toBe('/git-lab?lesson=1-2')
  })

  it('creates workspace-based review paths for future learning modules', () => {
    expect(createMistakeReviewPath({ source: 'workspace', lessonId: 'react state' })).toBe(
      '/workspace?mission=react%20state',
    )
    expect(createMistakeReviewPath({ source: 'algorithm', lessonId: 'bfs-queue' })).toBe(
      '/workspace?mission=bfs-queue',
    )
    expect(createMistakeReviewPath({ source: 'api-practice', lessonId: 'fastapi-route' })).toBe(
      '/workspace?mission=fastapi-route',
    )
  })

  it('returns readable source labels', () => {
    expect(getMistakeNoteSourceLabel('git-lab')).toBe('Git Lab')
    expect(getMistakeNoteSourceLabel('workspace')).toBe('Workspace')
    expect(getMistakeNoteSourceLabel('algorithm')).toBe('알고리즘 실습')
    expect(getMistakeNoteSourceLabel('api-practice')).toBe('API 실습')
  })
})