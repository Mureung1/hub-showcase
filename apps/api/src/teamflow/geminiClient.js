import { TeamFlowApiError } from './aiErrors.js'

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta'
const REQUIRED_RESULT_HEADINGS = Object.freeze([
  '## 작업 요청 요약',
  '## 참고한 컨텍스트',
  '## 작업 결과',
  '## 제안하는 다음 행동',
])

const ERROR_DEFINITIONS = Object.freeze({
  invalidCredential: {
    status: 422,
    code: 'AI_CREDENTIAL_INVALID',
    message: 'Gemini API 키를 확인해 주세요.',
  },
  quotaExceeded: {
    status: 429,
    code: 'AI_QUOTA_EXCEEDED',
    message: 'Gemini API 사용 한도를 초과했습니다.',
  },
  modelUnavailable: {
    status: 503,
    code: 'AI_MODEL_UNAVAILABLE',
    message: '설정된 Gemini 모델을 사용할 수 없습니다.',
  },
  unavailable: {
    status: 503,
    code: 'AI_PROVIDER_UNAVAILABLE',
    message: 'Gemini 서비스에 연결할 수 없습니다.',
  },
  invalidResponse: {
    status: 502,
    code: 'AI_PROVIDER_INVALID_RESPONSE',
    message: 'Gemini 응답을 처리할 수 없습니다.',
  },
  timeout: {
    status: 504,
    code: 'AI_PROVIDER_TIMEOUT',
    message: 'Gemini 응답 시간이 초과되었습니다.',
  },
})

const PROVIDER_STATUS_ERRORS = Object.freeze({
  PERMISSION_DENIED: ERROR_DEFINITIONS.invalidCredential,
  UNAUTHENTICATED: ERROR_DEFINITIONS.invalidCredential,
  RESOURCE_EXHAUSTED: ERROR_DEFINITIONS.quotaExceeded,
  NOT_FOUND: ERROR_DEFINITIONS.modelUnavailable,
  FAILED_PRECONDITION: ERROR_DEFINITIONS.invalidResponse,
  INVALID_ARGUMENT: ERROR_DEFINITIONS.invalidResponse,
  INTERNAL: ERROR_DEFINITIONS.unavailable,
  UNAVAILABLE: ERROR_DEFINITIONS.unavailable,
  DEADLINE_EXCEEDED: ERROR_DEFINITIONS.timeout,
})

const PROVIDER_REASON_ERRORS = Object.freeze({
  API_KEY_INVALID: ERROR_DEFINITIONS.invalidCredential,
})

function apiError(definition, cause) {
  return new TeamFlowApiError({ ...definition, cause })
}

function responseError(status, {
  verification = false,
  providerStatus = null,
  providerReason = null,
} = {}) {
  const providerReasonDefinition = PROVIDER_REASON_ERRORS[providerReason]
  if (providerReasonDefinition) return apiError(providerReasonDefinition)
  const providerDefinition = PROVIDER_STATUS_ERRORS[providerStatus]
  if (providerDefinition) return apiError(providerDefinition)
  if (status === 401 || status === 403 || (verification && status === 400)) {
    return apiError(ERROR_DEFINITIONS.invalidCredential)
  }
  if (status === 400) return apiError(ERROR_DEFINITIONS.invalidResponse)
  if (status === 429) return apiError(ERROR_DEFINITIONS.quotaExceeded)
  if (status === 404) return apiError(ERROR_DEFINITIONS.modelUnavailable)
  if (status >= 500) return apiError(ERROR_DEFINITIONS.unavailable)
  return apiError(ERROR_DEFINITIONS.invalidResponse)
}

async function readProviderErrorClassification(response) {
  try {
    const payload = await response.json()
    const status = payload?.error?.status
    const details = Array.isArray(payload?.error?.details) ? payload.error.details : []
    const providerReason = details
      .map((detail) => detail?.reason)
      .find((reason) => (
        typeof reason === 'string'
        && Object.hasOwn(PROVIDER_REASON_ERRORS, reason)
      )) ?? null
    const providerStatus = typeof status === 'string' && Object.hasOwn(PROVIDER_STATUS_ERRORS, status)
      ? status
      : null
    return { providerReason, providerStatus }
  } catch {
    return { providerReason: null, providerStatus: null }
  }
}

function usageValue(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

function hasRequiredResultStructure(markdown) {
  const lines = markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
  let previousIndex = -1
  for (const heading of REQUIRED_RESULT_HEADINGS) {
    const index = lines.indexOf(heading, previousIndex + 1)
    if (index < 0) return false
    previousIndex = index
  }
  return true
}

export function createGeminiClient({
  fetchImpl = globalThis.fetch,
  model,
  timeoutMs,
  now = () => performance.now(),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Gemini fetch 구현이 필요합니다.')
  if (typeof model !== 'string' || !model) throw new Error('Gemini 모델이 필요합니다.')
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Gemini 제한 시간이 필요합니다.')

  const modelPath = encodeURIComponent(model)

  async function requestJson(url, options = {}, errorContext = {}) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: controller.signal,
      })
      if (!response.ok) {
        const providerError = await readProviderErrorClassification(response)
        throw responseError(response.status, {
          ...errorContext,
          ...providerError,
        })
      }
      try {
        return await response.json()
      } catch (error) {
        throw apiError(ERROR_DEFINITIONS.invalidResponse, error)
      }
    } catch (error) {
      if (error instanceof TeamFlowApiError) throw error
      if (error?.name === 'AbortError') {
        throw apiError(ERROR_DEFINITIONS.timeout, error)
      }
      throw apiError(ERROR_DEFINITIONS.unavailable, error)
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    async verifyApiKey(apiKey) {
      await requestJson(`${API_ROOT}/models/${modelPath}`, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      }, { verification: true })
      return { provider: 'gemini', model }
    },
    async generate({
      apiKey,
      systemInstruction,
      prompt,
    }) {
      const startedAt = now()
      try {
        const payload = await requestJson(`${API_ROOT}/models/${modelPath}:generateContent`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [{
              role: 'user',
              parts: [{ text: prompt }],
            }],
            generationConfig: {
              candidateCount: 1,
              maxOutputTokens: 4096,
            },
          }),
        })

        const parts = payload?.candidates?.[0]?.content?.parts
      const resultMarkdown = (Array.isArray(parts) ? parts : [])
        .map((part) => (typeof part?.text === 'string' ? part.text.trim() : ''))
        .filter(Boolean)
        .join('\n\n')
      if (!resultMarkdown || !hasRequiredResultStructure(resultMarkdown)) {
        throw apiError(ERROR_DEFINITIONS.invalidResponse)
      }

        const usage = payload.usageMetadata ?? {}
        return {
          resultMarkdown,
          provider: 'gemini',
          model,
          usage: {
            inputTokens: usageValue(usage.promptTokenCount),
            outputTokens: usageValue(usage.candidatesTokenCount),
            totalTokens: usageValue(usage.totalTokenCount),
          },
          durationMs: Math.max(0, Math.round(now() - startedAt)),
        }
      } catch (error) {
        if (error instanceof TeamFlowApiError && error.durationMs === null) {
          error.durationMs = Math.max(0, Math.round(now() - startedAt))
        }
        throw error
      }
    },
  }
}
