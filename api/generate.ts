import { waitUntil } from '@vercel/functions'
import { createEnvironmentGenerationMetricsSink } from './_lib/db/generationMetricsSink.js'
import { createEnvironmentGenerationProvider } from './_lib/generation/geminiProvider.js'
import { createGenerateHandler } from './_lib/generation/handler.js'
import { createInMemoryRateLimiter } from './_lib/generation/rateLimiter.js'

const handleGenerate = createGenerateHandler({
  metricsSink: createEnvironmentGenerationMetricsSink({
    environment: process.env,
    schedule: waitUntil,
  }),
  provider: createEnvironmentGenerationProvider(process.env),
  rateLimiter: createInMemoryRateLimiter(),
})

export default { fetch: handleGenerate }
