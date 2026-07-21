import { waitUntil } from '@vercel/functions'
import { createEnvironmentInteractionMetricsSink } from './_lib/db/interactionMetricsSink.js'
import { createInMemoryRateLimiter } from './_lib/generation/rateLimiter.js'
import { createInteractionHandler } from './_lib/interaction/handler.js'

const handleInteraction = createInteractionHandler({
  eventSink: createEnvironmentInteractionMetricsSink({
    environment: process.env,
    schedule: waitUntil,
  }),
  rateLimiter: createInMemoryRateLimiter(),
})

export default { fetch: handleInteraction }
