import { describe, expect, it } from 'vitest'
import { getKstChallengeDateString } from './kst-date.js'

describe('getKstChallengeDateString', () => {
  it('stays on the previous day just before 07:00 KST', () => {
    const beforeRollover = new Date('2026-07-20T21:59:00Z')
    expect(getKstChallengeDateString(beforeRollover)).toBe('2026-07-20')
  })

  it('rolls over to the next day at/after 07:00 KST', () => {
    const afterRollover = new Date('2026-07-20T22:01:00Z')
    expect(getKstChallengeDateString(afterRollover)).toBe('2026-07-21')
  })
})
