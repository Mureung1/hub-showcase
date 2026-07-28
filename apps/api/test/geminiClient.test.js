import assert from 'node:assert/strict'
import test from 'node:test'

import { TeamFlowApiError } from '../src/teamflow/aiErrors.js'
import { createGeminiClient } from '../src/teamflow/geminiClient.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function structuredAgentResult(overrides = {}) {
  return {
    plan: [
      '배정된 할 일과 역할 프롬프트를 확인합니다.',
      '선택된 프로젝트 컨텍스트를 근거로 결과를 작성합니다.',
    ],
    resultMarkdown: '# 경쟁사 조사 결과\n\n검증 가능한 범위의 결과입니다.',
    selfReview: {
      roleFollowed: true,
      requirementsMet: true,
      selectedContextOnly: true,
      issues: [],
    },
    suggestedNextAction: '결과의 근거를 사람이 검토합니다.',
    ...overrides,
  }
}

function generationResponse(result, usage = {}) {
  return jsonResponse({
    candidates: [{
      content: {
        parts: [{
          text: typeof result === 'string' ? result : JSON.stringify(result),
        }],
      },
    }],
    usageMetadata: usage,
  })
}

test('Gemini key verification uses the fixed model endpoint and secret header', async () => {
  const requests = []
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return jsonResponse({ name: 'models/gemini-test-flash' })
    },
  })

  const result = await client.verifyApiKey('user-secret')

  assert.deepEqual(result, {
    provider: 'gemini',
    model: 'gemini-test-flash',
  })
  assert.equal(requests[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-flash')
  assert.equal(requests[0].options.headers['x-goog-api-key'], 'user-secret')
  assert.equal(requests[0].url.includes('user-secret'), false)
})

test('Gemini generation accepts a valid structured result with one provider request', async () => {
  const requests = []
  const times = [100, 245]
  const structuredResult = structuredAgentResult()
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    now: () => times.shift(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return generationResponse(structuredResult, {
          promptTokenCount: 12,
          candidatesTokenCount: 34,
          totalTokenCount: 46,
      })
    },
  })

  const result = await client.generate({
    apiKey: 'user-secret',
    systemInstruction: '고정 시스템 지시',
    prompt: '프로젝트 컨텍스트',
  })

  assert.deepEqual(result, {
    resultMarkdown: structuredResult.resultMarkdown,
    agentTrace: {
      version: 1,
      plan: structuredResult.plan,
      selfReview: structuredResult.selfReview,
      suggestedNextAction: structuredResult.suggestedNextAction,
      attemptCount: 1,
      repaired: false,
    },
    provider: 'gemini',
    model: 'gemini-test-flash',
    usage: {
      inputTokens: 12,
      outputTokens: 34,
      totalTokens: 46,
    },
    durationMs: 145,
  })
  const body = JSON.parse(requests[0].options.body)
  assert.equal(requests[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-flash:generateContent')
  assert.deepEqual(body.systemInstruction, { parts: [{ text: '고정 시스템 지시' }] })
  assert.deepEqual(body.contents, [{
    role: 'user',
    parts: [{ text: '프로젝트 컨텍스트' }],
  }])
  assert.deepEqual(body.generationConfig, {
    candidateCount: 1,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseJsonSchema: body.generationConfig.responseJsonSchema,
  })
  assert.equal(body.generationConfig.responseJsonSchema.type, 'object')
  assert.deepEqual(body.generationConfig.responseJsonSchema.required, [
    'plan',
    'resultMarkdown',
    'selfReview',
    'suggestedNextAction',
  ])
  assert.equal(Object.hasOwn(body.generationConfig, 'temperature'), false)
  assert.equal(requests.length, 1)
})

test('Gemini generation repairs a self-review failure exactly once and aggregates usage and duration', async () => {
  const requests = []
  const times = [100, 150, 200, 275]
  const first = structuredAgentResult({
    resultMarkdown: '# 초안\n\n선택하지 않은 자료를 참고했습니다.',
    selfReview: {
      roleFollowed: true,
      requirementsMet: true,
      selectedContextOnly: false,
      issues: ['선택하지 않은 자료를 참고했습니다.'],
    },
  })
  const repaired = structuredAgentResult({
    resultMarkdown: '# 보완 결과\n\n선택된 자료만 사용했습니다.',
  })
  const responses = [
    generationResponse(first, {
      promptTokenCount: 10,
      candidatesTokenCount: 20,
      totalTokenCount: 30,
    }),
    generationResponse(repaired, {
      promptTokenCount: 7,
      candidatesTokenCount: 11,
      totalTokenCount: 18,
    }),
  ]
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    now: () => times.shift(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return responses.shift()
    },
  })

  const result = await client.generate({
    apiKey: 'user-secret',
    systemInstruction: '고정 시스템 지시',
    prompt: '{"task":"경쟁사 조사"}',
  })

  assert.equal(requests.length, 2)
  assert.equal(result.resultMarkdown, repaired.resultMarkdown)
  assert.deepEqual(result.agentTrace, {
    version: 1,
    plan: repaired.plan,
    selfReview: repaired.selfReview,
    suggestedNextAction: repaired.suggestedNextAction,
    attemptCount: 2,
    repaired: true,
  })
  assert.deepEqual(result.usage, {
    inputTokens: 17,
    outputTokens: 31,
    totalTokens: 48,
  })
  assert.equal(result.durationMs, 125)
  const repairBody = JSON.parse(requests[1].options.body)
  assert.match(repairBody.contents[0].parts[0].text, /보완 요청/)
  assert.match(repairBody.contents[0].parts[0].text, /선택하지 않은 자료/)
})

test('Gemini generation fails safely after one unsuccessful repair and preserves aggregate metadata', async () => {
  const requests = []
  const times = [10, 30, 50, 90]
  const responses = [
    generationResponse('not-json', {
      promptTokenCount: 3,
      candidatesTokenCount: 4,
      totalTokenCount: 7,
    }),
    generationResponse(structuredAgentResult({
      selfReview: {
        roleFollowed: false,
        requirementsMet: true,
        selectedContextOnly: true,
        issues: ['역할 프롬프트를 따르지 않았습니다.'],
      },
    }), {
      promptTokenCount: 5,
      candidatesTokenCount: 6,
      totalTokenCount: 11,
    }),
  ]
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    now: () => times.shift(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return responses.shift()
    },
  })

  await assert.rejects(
    () => client.generate({
      apiKey: 'user-secret',
      systemInstruction: 'system',
      prompt: 'prompt',
    }),
    (error) => {
      assert.equal(error instanceof TeamFlowApiError, true)
      assert.equal(error.code, 'AI_PROVIDER_INVALID_RESPONSE')
      assert.equal(error.durationMs, 60)
      assert.deepEqual(error.usage, {
        inputTokens: 8,
        outputTokens: 10,
        totalTokens: 18,
      })
      return true
    },
  )
  assert.equal(requests.length, 2)
})

test('Gemini provider failures are not automatically retried', async () => {
  let requestCount = 0
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    now: () => 100,
    fetchImpl: async () => {
      requestCount += 1
      return jsonResponse({
        error: {
          status: 'UNAVAILABLE',
          message: 'provider unavailable',
        },
      }, 503)
    },
  })

  await assert.rejects(
    () => client.generate({
      apiKey: 'user-secret',
      systemInstruction: 'system',
      prompt: 'prompt',
    }),
    (error) => error.code === 'AI_PROVIDER_UNAVAILABLE',
  )
  assert.equal(requestCount, 1)
})

test('Gemini errors are sanitized and mapped without leaking the API key', async () => {
  for (const [providerStatus, status, code] of [
    [400, 502, 'AI_PROVIDER_INVALID_RESPONSE'],
    [401, 422, 'AI_CREDENTIAL_INVALID'],
    [403, 422, 'AI_CREDENTIAL_INVALID'],
    [429, 429, 'AI_QUOTA_EXCEEDED'],
    [500, 503, 'AI_PROVIDER_UNAVAILABLE'],
    [404, 503, 'AI_MODEL_UNAVAILABLE'],
  ]) {
    const times = [100, 275]
    const client = createGeminiClient({
      model: 'gemini-test-flash',
      timeoutMs: 1000,
      now: () => times.shift(),
      fetchImpl: async () => jsonResponse({
        error: { message: 'provider exposed user-secret' },
      }, providerStatus),
    })

    await assert.rejects(
      () => client.generate({
        apiKey: 'user-secret',
        systemInstruction: 'system',
        prompt: 'prompt',
      }),
      (error) => {
        assert.equal(error instanceof TeamFlowApiError, true)
        assert.equal(error.status, status)
        assert.equal(error.code, code)
        assert.equal(error.message.includes('user-secret'), false)
        assert.equal(error.durationMs, 175)
        return true
      },
    )
  }
})

test('Gemini key verification maps rejected verification requests to an invalid credential', async () => {
  for (const providerStatus of [400, 401, 403]) {
    const client = createGeminiClient({
      model: 'gemini-test-flash',
      timeoutMs: 1000,
      fetchImpl: async () => jsonResponse({ error: { message: 'rejected' } }, providerStatus),
    })

    await assert.rejects(
      () => client.verifyApiKey('secret'),
      (error) => error.status === 422 && error.code === 'AI_CREDENTIAL_INVALID',
    )
  }
})

test('Gemini safe error statuses override HTTP fallbacks without exposing provider details', async () => {
  for (const [providerErrorStatus, status, code] of [
    ['PERMISSION_DENIED', 422, 'AI_CREDENTIAL_INVALID'],
    ['UNAUTHENTICATED', 422, 'AI_CREDENTIAL_INVALID'],
    ['RESOURCE_EXHAUSTED', 429, 'AI_QUOTA_EXCEEDED'],
    ['NOT_FOUND', 503, 'AI_MODEL_UNAVAILABLE'],
    ['FAILED_PRECONDITION', 502, 'AI_PROVIDER_INVALID_RESPONSE'],
    ['INVALID_ARGUMENT', 502, 'AI_PROVIDER_INVALID_RESPONSE'],
    ['INTERNAL', 503, 'AI_PROVIDER_UNAVAILABLE'],
    ['UNAVAILABLE', 503, 'AI_PROVIDER_UNAVAILABLE'],
    ['DEADLINE_EXCEEDED', 504, 'AI_PROVIDER_TIMEOUT'],
  ]) {
    const client = createGeminiClient({
      model: 'gemini-test-flash',
      timeoutMs: 1000,
      fetchImpl: async () => jsonResponse({
        error: {
          status: providerErrorStatus,
          message: 'provider exposed user-secret',
        },
      }, 400),
    })

    await assert.rejects(
      () => client.generate({
        apiKey: 'user-secret',
        systemInstruction: 'system',
        prompt: 'prompt',
      }),
      (error) => {
        assert.equal(error instanceof TeamFlowApiError, true)
        assert.equal(error.status, status)
        assert.equal(error.code, code)
        assert.equal(error.message.includes('user-secret'), false)
        assert.equal(error.cause, undefined)
        return true
      },
    )
  }
})

test('Gemini verification does not treat precondition or argument errors as invalid credentials', async () => {
  for (const providerErrorStatus of ['FAILED_PRECONDITION', 'INVALID_ARGUMENT']) {
    const client = createGeminiClient({
      model: 'gemini-test-flash',
      timeoutMs: 1000,
      fetchImpl: async () => jsonResponse({
        error: {
          status: providerErrorStatus,
          message: 'provider exposed user-secret',
        },
      }, 400),
    })

    await assert.rejects(
      () => client.verifyApiKey('user-secret'),
      (error) => {
        assert.equal(error.status, 502)
        assert.equal(error.code, 'AI_PROVIDER_INVALID_RESPONSE')
        assert.equal(error.message.includes('user-secret'), false)
        assert.equal(error.cause, undefined)
        return true
      },
    )
  }
})

test('Gemini API_KEY_INVALID reason overrides INVALID_ARGUMENT without exposing structured details', async () => {
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    fetchImpl: async () => jsonResponse({
      error: {
        status: 'INVALID_ARGUMENT',
        message: 'provider exposed user-secret',
        details: [{
          reason: 'API_KEY_INVALID',
          domain: 'provider exposed user-secret',
          metadata: { apiKey: 'user-secret' },
        }],
      },
    }, 400),
  })

  await assert.rejects(
    () => client.generate({
      apiKey: 'user-secret',
      systemInstruction: 'system',
      prompt: 'prompt',
    }),
    (error) => {
      assert.equal(error.status, 422)
      assert.equal(error.code, 'AI_CREDENTIAL_INVALID')
      assert.equal(error.message.includes('user-secret'), false)
      assert.equal(error.cause, undefined)
      return true
    },
  )
})

test('Gemini ignores unknown structured reasons and keeps INVALID_ARGUMENT as an invalid response', async () => {
  for (const details of [
    [],
    [{ reason: 'UNKNOWN_REASON', message: 'provider exposed user-secret' }],
    [{ reason: 1234, domain: 'provider exposed user-secret' }],
  ]) {
    const client = createGeminiClient({
      model: 'gemini-test-flash',
      timeoutMs: 1000,
      fetchImpl: async () => jsonResponse({
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'provider exposed user-secret',
          details,
        },
      }, 400),
    })

    await assert.rejects(
      () => client.generate({
        apiKey: 'user-secret',
        systemInstruction: 'system',
        prompt: 'prompt',
      }),
      (error) => {
        assert.equal(error.status, 502)
        assert.equal(error.code, 'AI_PROVIDER_INVALID_RESPONSE')
        assert.equal(error.message.includes('user-secret'), false)
        assert.equal(error.cause, undefined)
        return true
      },
    )
  }
})

test('Gemini rejects malformed or empty responses and maps network failures', async () => {
  const malformedHttpResponseClient = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    fetchImpl: async () => new Response('not-json', { status: 200 }),
  })
  await assert.rejects(
    () => malformedHttpResponseClient.generate({
      apiKey: 'secret',
      systemInstruction: 'system',
      prompt: 'prompt',
    }),
    (error) => error.status === 502 && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
  )

  for (const responseFactory of [
    () => jsonResponse({ candidates: [] }),
    () => jsonResponse({ candidates: [{ content: { parts: [] } }] }),
  ]) {
    let requestCount = 0
    const client = createGeminiClient({
      model: 'gemini-test-flash',
      timeoutMs: 1000,
      fetchImpl: async () => {
        requestCount += 1
        return responseFactory()
      },
    })

    await assert.rejects(
      () => client.generate({ apiKey: 'secret', systemInstruction: 'system', prompt: 'prompt' }),
      (error) => error.status === 502 && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
    )
    assert.equal(requestCount, 2)
  }

  const unavailable = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    fetchImpl: async () => {
      throw new Error('network contains secret')
    },
  })
  await assert.rejects(
    () => unavailable.verifyApiKey('secret'),
    (error) => error.status === 503 && error.code === 'AI_PROVIDER_UNAVAILABLE',
  )
})

test('Gemini requests abort at the configured timeout', async () => {
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(new DOMException('aborted', 'AbortError'))
      })
    }),
  })

  await assert.rejects(
    () => client.verifyApiKey('secret'),
    (error) => error.status === 504 && error.code === 'AI_PROVIDER_TIMEOUT',
  )
})
