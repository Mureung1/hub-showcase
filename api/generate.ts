import { waitUntil } from '@vercel/functions'
import { createEnvironmentGenerationMetricsSink } from './_lib/db/generationMetricsSink'
import { createEnvironmentGenerationProvider } from './_lib/generation/geminiProvider'
import { createGenerateHandler } from './_lib/generation/handler'
import { createInMemoryRateLimiter } from './_lib/generation/rateLimiter'

const handleGenerate = createGenerateHandler({
  metricsSink: createEnvironmentGenerationMetricsSink({
    environment: process.env,
    schedule: waitUntil,
  }),
  provider: createEnvironmentGenerationProvider(process.env),
  rateLimiter: createInMemoryRateLimiter(),
})

export default { fetch: handleGenerate }
