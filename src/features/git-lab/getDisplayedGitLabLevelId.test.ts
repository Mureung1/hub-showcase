import { describe, expect, it } from 'vitest'
import { getDisplayedGitLabLevelId, getDisplayedGitLabLevelIds } from './getDisplayedGitLabLevelId'

describe('getDisplayedGitLabLevelId', () => {
  it('maps legacy Git Lab ids to their numeric Pro Git curriculum lessons', () => {
    expect(getDisplayedGitLabLevelId('intro1')).toBe('1-3')
    expect(getDisplayedGitLabLevelId('branch1')).toBe('2-1')
    expect(getDisplayedGitLabLevelId('checkout1')).toBe('2-2')
    expect(getDisplayedGitLabLevelId('merge1')).toBe('2-5')
    expect(getDisplayedGitLabLevelId('3-9')).toBe('3-9')
  })

  it('deduplicates mapped completion ids', () => {
    expect(getDisplayedGitLabLevelIds(['intro1', '1-3', 'branch1'])).toEqual(['1-3', '2-1'])
  })
})
