import { describe, expect, it } from 'vitest'
import { createInMemoryRateLimiter } from './rateLimiter.js'

describe('createInMemoryRateLimiter', () => {
  it('allows ten requests per client during a 60 second window', () => {
    let now = 1_000
    const limiter = createInMemoryRateLimiter({ now: () => now })

    for (let requestCount = 0; requestCount < 10; requestCount += 1) {
      expect(limiter.consume('client-a')).toBe(true)
    }
    expect(limiter.consume('client-a')).toBe(false)
    expect(limiter.consume('client-b')).toBe(true)

    now += 60_000
    expect(limiter.consume('client-a')).toBe(true)
  })
})
