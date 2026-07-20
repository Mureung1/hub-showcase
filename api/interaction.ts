import { waitUntil } from '@vercel/functions'
import { createEnvironmentInteractionMetricsSink } from './_lib/db/interactionMetricsSink'
import { createInMemoryRateLimiter } from './_lib/generation/rateLimiter'
import { createInteractionHandler } from './_lib/interaction/handler'

const handleInteraction = createInteractionHandler({
  eventSink: createEnvironmentInteractionMetricsSink({
    environment: process.env,
    schedule: waitUntil,
  }),
  rateLimiter: createInMemoryRateLimiter(),
})

export default { fetch: handleInteraction }
