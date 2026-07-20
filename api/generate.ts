import { waitUntil } from '@vercel/functions'
import { createEnvironmentGenerationMetricsSink } from './_lib/db/generationMetricsSink'
import { createGenerateHandler } from './_lib/generation/handler'
import { createUnconfiguredGenerationProvider } from './_lib/generation/provider'
import { createInMemoryRateLimiter } from './_lib/generation/rateLimiter'

const handleGenerate = createGenerateHandler({
  metricsSink: createEnvironmentGenerationMetricsSink({
    environment: process.env,
    schedule: waitUntil,
  }),
  provider: createUnconfiguredGenerationProvider(),
  rateLimiter: createInMemoryRateLimiter(),
})

export default { fetch: handleGenerate }
