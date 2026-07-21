import { buildPromptWithReviewedExamples } from '../prompt/buildPrompt'
import { parseCompletedStructuredOutput } from '../prompt/outputSchema'
import {
  createUnconfiguredGenerationProvider,
  GenerationProviderError,
  type AiGenerationRequest,
  type GenerationProvider,
  type GenerationProviderOptions,
} from './provider'

const defaultModel = 'gemini-3.1-flash-lite'
const generateContentEndpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

type GeminiGenerationProviderOptions = {
  readonly apiKey: string
  readonly fetchImplementation?: typeof fetch
  readonly model: string
}

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null

const failureForStatus = (status: number) => {
  if (status === 429) return 'rate_limited' as const
  if (status >= 500) return 'transient' as const
  return 'client_error' as const
}

const firstCandidate = (body: unknown): RecordValue | null => {
  if (!isRecord(body) || !Array.isArray(body.candidates) || body.candidates.length === 0) return null
  const candidate = body.candidates[0]
  return isRecord(candidate) ? candidate : null
}

const extractText = (candidate: RecordValue | null): string | null => {
  const content = candidate?.content
  if (!isRecord(content) || !Array.isArray(content.parts) || content.parts.length === 0) return null
  const part = content.parts[0]
  return isRecord(part) && typeof part.text === 'string' ? part.text : null
}

const normalizedStopReason = (candidate: RecordValue | null): string =>
  candidate?.finishReason === 'STOP' ? 'end_turn' : 'other'

/**
 * Gemini's responseSchema is an OpenAPI 3.0 Schema subset: it rejects the
 * `additionalProperties` keyword outright and only accepts string `enum`
 * values. The stricter JSON Schema sent to other providers is relaxed here;
 * `parseCompletedStructuredOutput` still enforces the real contract at runtime.
 */
const toGeminiSchema = (schema: unknown): unknown => {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema)
  if (!isRecord(schema)) return schema

  const { additionalProperties: _additionalProperties, enum: enumValues, ...rest } = schema
  const sanitized: RecordValue = {}
  for (const [key, value] of Object.entries(rest)) {
    sanitized[key] = toGeminiSchema(value)
  }
  if (Array.isArray(enumValues) && enumValues.every((value) => typeof value === 'string')) {
    sanitized.enum = enumValues
  }
  return sanitized
}

export const createGeminiGenerationProvider = (
  options: GeminiGenerationProviderOptions,
): GenerationProvider => {
  const apiKey = options.apiKey.trim()
  const model = options.model.trim()
  const fetchImplementation = options.fetchImplementation ?? fetch

  if (!apiKey || !model) throw new GenerationProviderError('unconfigured')

  return {
    async generate(request: AiGenerationRequest, generationOptions: GenerationProviderOptions) {
      const prompt = buildPromptWithReviewedExamples(request)

      let response: Response
      try {
        response = await fetchImplementation(generateContentEndpoint(model), {
          body: JSON.stringify({
            contents: prompt.messages.map((message) => ({
              parts: [{ text: message.content }],
              role: 'user',
            })),
            generationConfig: {
              maxOutputTokens: generationOptions.maxOutputTokens,
              responseMimeType: 'application/json',
              responseSchema: toGeminiSchema(prompt.output_config.format.schema),
            },
            systemInstruction: { parts: [{ text: prompt.system }] },
          }),
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          method: 'POST',
          signal: generationOptions.signal,
        })
      } catch {
        throw new GenerationProviderError('transient')
      }

      if (!response.ok) throw new GenerationProviderError(failureForStatus(response.status))

      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new GenerationProviderError('transient')
      }

      const candidate = firstCandidate(body)
      const text = extractText(candidate)
      if (text === null) return null

      return parseCompletedStructuredOutput(normalizedStopReason(candidate), text)
    },
  }
}

export type GenerationProviderEnvironment = {
  readonly GEMINI_API_KEY?: string
  readonly GEMINI_MODEL?: string
}

export const createEnvironmentGenerationProvider = (
  environment: GenerationProviderEnvironment,
): GenerationProvider => {
  const apiKey = environment.GEMINI_API_KEY?.trim()
  if (!apiKey) return createUnconfiguredGenerationProvider()

  return createGeminiGenerationProvider({
    apiKey,
    model: environment.GEMINI_MODEL?.trim() || defaultModel,
  })
}
