import { describe, expect, it } from 'vitest'
import { CHALLENGE_TOPICS, pickChallengeTopic } from './challenge-seed.js'

describe('pickChallengeTopic', () => {
  it('returns the same topic for the same date', () => {
    const first = pickChallengeTopic('2026-07-20')
    const second = pickChallengeTopic('2026-07-20')
    expect(first).toBe(second)
  })

  it('returns a topic from the seed pool', () => {
    expect(CHALLENGE_TOPICS).toContain(pickChallengeTopic('2026-07-21'))
  })
})
