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

test('Gemini generation sends a bounded single-candidate request and maps text and usage', async () => {
  const requests = []
  const times = [100, 245]
  const structuredMarkdown = [
    '## 작업 요청 요약',
    '요청 요약',
    '## 참고한 컨텍스트',
    '프로젝트 설명',
    '## 작업 결과',
    '본문',
    '## 제안하는 다음 행동',
    '결과를 검토합니다.',
  ].join('\n\n')
  const client = createGeminiClient({
    model: 'gemini-test-flash',
    timeoutMs: 1000,
    now: () => times.shift(),
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return jsonResponse({
        candidates: [{
          content: {
            parts: [{ text: structuredMarkdown }],
          },
        }],
        usageMetadata: {
          promptTokenCount: 12,
          candidatesTokenCount: 34,
          totalTokenCount: 46,
        },
      })
    },
  })

  const result = await client.generate({
    apiKey: 'user-secret',
    systemInstruction: '고정 시스템 지시',
    prompt: '프로젝트 컨텍스트',
  })

  assert.deepEqual(result, {
    resultMarkdown: structuredMarkdown,
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
  })
  assert.equal(Object.hasOwn(body.generationConfig, 'temperature'), false)
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
  for (const response of [
    new Response('not-json', { status: 200 }),
    jsonResponse({ candidates: [] }),
    jsonResponse({ candidates: [{ content: { parts: [] } }] }),
    jsonResponse({ candidates: [{ content: { parts: [{ text: '고정 섹션이 없는 답변' }] } }] }),
  ]) {
    const client = createGeminiClient({
      model: 'gemini-test-flash',
      timeoutMs: 1000,
      fetchImpl: async () => response,
    })

    await assert.rejects(
      () => client.generate({ apiKey: 'secret', systemInstruction: 'system', prompt: 'prompt' }),
      (error) => error.status === 502 && error.code === 'AI_PROVIDER_INVALID_RESPONSE',
    )
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
