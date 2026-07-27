import { describe, expect, it } from 'vitest'
import { CHALLENGE_CATEGORIES, CHALLENGE_TOPICS, pickChallengeTopic } from './challenge-seed.js'

describe('pickChallengeTopic', () => {
  it('returns the same topic for the same seed', () => {
    const first = pickChallengeTopic('user1-2026-07-20')
    const second = pickChallengeTopic('user1-2026-07-20')
    expect(first).toBe(second)
  })

  it('returns a topic from the seed pool', () => {
    const topics = CHALLENGE_TOPICS.map((item) => item.topic)
    expect(topics).toContain(pickChallengeTopic('user1-2026-07-21'))
  })

  it('mostly returns a topic from the preferred category when set', () => {
    const category = CHALLENGE_CATEGORIES[0]!
    const categoryTopics = CHALLENGE_TOPICS.filter((item) => item.category === category).map(
      (item) => item.topic,
    )

    let matchCount = 0
    for (let i = 0; i < 20; i += 1) {
      const topic = pickChallengeTopic(`user-${i}-2026-07-22`, category)
      if (categoryTopics.includes(topic)) {
        matchCount += 1
      }
    }

    expect(matchCount).toBeGreaterThan(10)
  })

  it('falls back to the full pool for users without a preference', () => {
    const topics = CHALLENGE_TOPICS.map((item) => item.topic)
    expect(topics).toContain(pickChallengeTopic('user2-2026-07-23', null))
  })
})
