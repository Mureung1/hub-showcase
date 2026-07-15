import { createGenerateHandler } from './_lib/generation/handler'
import { noopGenerationMetricsSink } from './_lib/generation/metrics'
import { createUnconfiguredGenerationProvider } from './_lib/generation/provider'
import { createInMemoryRateLimiter } from './_lib/generation/rateLimiter'

const handleGenerate = createGenerateHandler({
  metricsSink: noopGenerationMetricsSink,
  provider: createUnconfiguredGenerationProvider(),
  rateLimiter: createInMemoryRateLimiter(),
})

export default { fetch: handleGenerate }
