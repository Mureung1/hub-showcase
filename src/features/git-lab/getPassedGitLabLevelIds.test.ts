import { describe, expect, it } from 'vitest'
import { getPassedGitLabLevelIds } from './getPassedGitLabLevelIds'

describe('getPassedGitLabLevelIds', () => {
  it('returns unique level ids from passed server attempts only', () => {
    expect(getPassedGitLabLevelIds([
      { id: 'a1', lessonId: '1-1', command: 'git init', result: 'passed', reason: '', createdAt: 'now' },
      { id: 'a2', lessonId: '1-1', command: 'git status', result: 'passed', reason: '', createdAt: 'now' },
      { id: 'a3', lessonId: '1-2', command: 'git add .', result: 'failed', reason: '미완료', createdAt: 'now' },
    ])).toEqual(['1-1'])
  })
})
