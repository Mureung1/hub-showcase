export type RateLimiter = {
  consume: (clientKey: string) => boolean
}

type RateLimitBucket = {
  count: number
  windowStartedAt: number
}

type InMemoryRateLimiterOptions = {
  limit?: number
  now?: () => number
  windowMs?: number
}

export const createInMemoryRateLimiter = ({
  limit = 10,
  now = Date.now,
  windowMs = 60_000,
}: InMemoryRateLimiterOptions = {}): RateLimiter => {
  const buckets = new Map<string, RateLimitBucket>()

  return {
    consume(clientKey) {
      const currentTime = now()
      const bucket = buckets.get(clientKey)

      if (!bucket || currentTime - bucket.windowStartedAt >= windowMs) {
        buckets.set(clientKey, { count: 1, windowStartedAt: currentTime })
        return true
      }

      if (bucket.count >= limit) return false

      bucket.count += 1
      return true
    },
  }
}
