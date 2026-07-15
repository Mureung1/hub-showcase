import type { AiGenerationRequest } from './provider'

export type GenerationMetricStatus =
  | 'deadline_exceeded'
  | 'invalid_request'
  | 'invalid_response'
  | 'provider_client_error'
  | 'provider_error'
  | 'provider_rate_limited'
  | 'provider_transient_error'
  | 'provider_unconfigured'
  | 'rate_limited'
  | 'success'
  | 'unsafe_response'

export type GenerationMetric = {
  attemptCount: number
  latencyMs: number
  purposeId?: AiGenerationRequest['purpose']
  route: 'ai'
  scenarioId?: AiGenerationRequest['scenarioId']
  status: GenerationMetricStatus
}

export type GenerationMetricsSink = {
  record: (metric: GenerationMetric) => Promise<void> | void
}

export const noopGenerationMetricsSink: GenerationMetricsSink = {
  record: () => undefined,
}

export const recordGenerationMetric = (sink: GenerationMetricsSink, metric: GenerationMetric) => {
  try {
    const pendingRecord = sink.record(metric)
    if (pendingRecord) void pendingRecord.catch(() => undefined)
  } catch {
    // Metrics are best-effort and must never change the generation response.
  }
}
