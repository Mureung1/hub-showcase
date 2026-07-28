import { TeamFlowApiError } from './aiErrors.js'

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta'
const MAX_RESULT_MARKDOWN_LENGTH = 100_000
const MAX_REPAIR_RESPONSE_LENGTH = 60_000
const AGENT_RESULT_KEYS = Object.freeze([
  'plan',
  'resultMarkdown',
  'selfReview',
  'suggestedNextAction',
])
const SELF_REVIEW_KEYS = Object.freeze([
  'roleFollowed',
  'requirementsMet',
  'selectedContextOnly',
  'issues',
])
const EMPTY_USAGE = Object.freeze({
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
})

const AGENT_RESULT_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: AGENT_RESULT_KEYS,
  properties: {
    plan: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
      },
    },
    resultMarkdown: {
      type: 'string',
      minLength: 1,
      maxLength: MAX_RESULT_MARKDOWN_LENGTH,
    },
    selfReview: {
      type: 'object',
      additionalProperties: false,
      required: SELF_REVIEW_KEYS,
      properties: {
        roleFollowed: { type: 'boolean' },
        requirementsMet: { type: 'boolean' },
        selectedContextOnly: { type: 'boolean' },
        issues: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
          },
        },
      },
    },
    suggestedNextAction: {
      type: 'string',
      minLength: 1,
      maxLength: 1_000,
    },
  },
})

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

function apiError(definition, cause, metadata = {}) {
  return new TeamFlowApiError({ ...definition, ...metadata, cause })
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

function mapUsage(payload) {
  const usage = payload?.usageMetadata ?? {}
  return {
    inputTokens: usageValue(usage.promptTokenCount),
    outputTokens: usageValue(usage.candidatesTokenCount),
    totalTokens: usageValue(usage.totalTokenCount),
  }
}

function mergeUsage(...entries) {
  const merged = {}
  for (const key of Object.keys(EMPTY_USAGE)) {
    const values = entries
      .map((entry) => entry?.[key])
      .filter((value) => Number.isSafeInteger(value) && value >= 0)
    merged[key] = values.length > 0
      ? values.reduce((sum, value) => sum + value, 0)
      : null
  }
  return merged
}

function isPlainObject(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype,
  )
}

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort()
  return actual.length === keys.length
    && actual.every((key, index) => key === [...keys].sort()[index])
}

function boundedText(value, maxLength) {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\r\n?/g, '\n').trim()
  return normalized && normalized.length <= maxLength ? normalized : null
}

function validateStructuredResult(rawText) {
  let candidate
  try {
    candidate = JSON.parse(rawText)
  } catch {
    return {
      value: null,
      problems: ['응답이 유효한 JSON 객체가 아닙니다.'],
    }
  }

  const problems = []
  if (!isPlainObject(candidate) || !hasExactKeys(candidate, AGENT_RESULT_KEYS)) {
    return {
      value: null,
      problems: ['응답의 최상위 필드가 실행 계약과 일치하지 않습니다.'],
    }
  }

  const plan = Array.isArray(candidate.plan)
    ? candidate.plan.map((item) => boundedText(item, 500))
    : null
  if (!plan || plan.length < 1 || plan.length > 5 || plan.some((item) => !item)) {
    problems.push('plan은 1~5개의 짧은 문자열이어야 합니다.')
  }

  const resultMarkdown = boundedText(
    candidate.resultMarkdown,
    MAX_RESULT_MARKDOWN_LENGTH,
  )
  if (!resultMarkdown) {
    problems.push('resultMarkdown은 비어 있지 않은 제한 길이 문자열이어야 합니다.')
  }

  const review = candidate.selfReview
  let issues = null
  if (!isPlainObject(review) || !hasExactKeys(review, SELF_REVIEW_KEYS)) {
    problems.push('selfReview 필드가 실행 계약과 일치하지 않습니다.')
  } else {
    for (const key of [
      'roleFollowed',
      'requirementsMet',
      'selectedContextOnly',
    ]) {
      if (typeof review[key] !== 'boolean') {
        problems.push(`selfReview.${key}는 boolean이어야 합니다.`)
      }
    }
    issues = Array.isArray(review.issues)
      ? review.issues.map((issue) => boundedText(issue, 500))
      : null
    if (!issues || issues.length > 5 || issues.some((issue) => !issue)) {
      problems.push('selfReview.issues는 최대 5개의 짧은 문자열이어야 합니다.')
    }
  }

  const suggestedNextAction = boundedText(candidate.suggestedNextAction, 1_000)
  if (!suggestedNextAction) {
    problems.push('suggestedNextAction은 비어 있지 않은 제한 길이 문자열이어야 합니다.')
  }

  if (problems.length > 0) return { value: null, problems }

  const value = {
    plan,
    resultMarkdown,
    selfReview: {
      roleFollowed: review.roleFollowed,
      requirementsMet: review.requirementsMet,
      selectedContextOnly: review.selectedContextOnly,
      issues,
    },
    suggestedNextAction,
  }
  const reviewProblems = []
  if (!value.selfReview.roleFollowed) {
    reviewProblems.push('자체 점검에서 Agent 역할 미준수가 발견되었습니다.')
  }
  if (!value.selfReview.requirementsMet) {
    reviewProblems.push('자체 점검에서 할 일 요구사항 미충족이 발견되었습니다.')
  }
  if (!value.selfReview.selectedContextOnly) {
    reviewProblems.push('자체 점검에서 선택하지 않은 컨텍스트 사용이 발견되었습니다.')
  }
  reviewProblems.push(...value.selfReview.issues)
  return { value, problems: reviewProblems }
}

function extractCandidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts
  return (Array.isArray(parts) ? parts : [])
    .map((part) => (typeof part?.text === 'string' ? part.text.trim() : ''))
    .filter(Boolean)
    .join('\n\n')
}

function buildRepairPrompt(originalPrompt, rawResponse, problems) {
  return [
    '[보완 요청]',
    '아래 첫 응답의 검증 문제만 수정해 동일한 JSON 계약으로 다시 응답하세요.',
    '새로운 자료를 추가하거나 원래 할 일의 범위를 넓히지 마세요.',
    '',
    '검증 문제:',
    ...problems.map((problem) => `- ${problem}`),
    '',
    '원래 입력:',
    originalPrompt,
    '',
    '첫 응답:',
    rawResponse.slice(0, MAX_REPAIR_RESPONSE_LENGTH),
  ].join('\n')
}

function mapAgentTrace(result, attemptCount) {
  return {
    version: 1,
    plan: result.plan,
    selfReview: result.selfReview,
    suggestedNextAction: result.suggestedNextAction,
    attemptCount,
    repaired: attemptCount === 2,
  }
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
      const requestAttempt = async (attemptPrompt) => {
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
                parts: [{ text: attemptPrompt }],
              }],
              generationConfig: {
                candidateCount: 1,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json',
                responseJsonSchema: AGENT_RESULT_JSON_SCHEMA,
              },
            }),
          })
          return {
            rawResponse: extractCandidateText(payload),
            usage: mapUsage(payload),
            durationMs: Math.max(0, Math.round(now() - startedAt)),
          }
        } catch (error) {
          if (error instanceof TeamFlowApiError && error.durationMs === null) {
            error.durationMs = Math.max(0, Math.round(now() - startedAt))
          }
          throw error
        }
      }

      const firstAttempt = await requestAttempt(prompt)
      let totalUsage = mergeUsage(firstAttempt.usage)
      let totalDurationMs = firstAttempt.durationMs
      const firstValidation = validateStructuredResult(firstAttempt.rawResponse)
      if (firstValidation.value && firstValidation.problems.length === 0) {
        return {
          resultMarkdown: firstValidation.value.resultMarkdown,
          agentTrace: mapAgentTrace(firstValidation.value, 1),
          provider: 'gemini',
          model,
          usage: totalUsage,
          durationMs: totalDurationMs,
        }
      }

      const repairPrompt = buildRepairPrompt(
        prompt,
        firstAttempt.rawResponse,
        firstValidation.problems,
      )
      let secondAttempt
      try {
        secondAttempt = await requestAttempt(repairPrompt)
      } catch (error) {
        if (error instanceof TeamFlowApiError) {
          error.durationMs = totalDurationMs + (error.durationMs ?? 0)
          error.usage = mergeUsage(totalUsage, error.usage)
        }
        throw error
      }

      totalUsage = mergeUsage(totalUsage, secondAttempt.usage)
      totalDurationMs += secondAttempt.durationMs
      const secondValidation = validateStructuredResult(secondAttempt.rawResponse)
      if (!secondValidation.value || secondValidation.problems.length > 0) {
        throw apiError(ERROR_DEFINITIONS.invalidResponse, undefined, {
          usage: totalUsage,
          durationMs: totalDurationMs,
        })
      }

      return {
        resultMarkdown: secondValidation.value.resultMarkdown,
        agentTrace: mapAgentTrace(secondValidation.value, 2),
        provider: 'gemini',
        model,
        usage: totalUsage,
        durationMs: totalDurationMs,
      }
    },
  }
}
