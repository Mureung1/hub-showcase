import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../index.js'
import { safeParseAppAnalysis } from '../schemas/appAnalysisSchema.js'

function closeTestServer(server) {
  if (!server?.listening) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

function startTestServer(app = createApp()) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1')

    const handleError = (error) => {
      server.off('listening', handleListening)
      reject(error)
    }

    const handleListening = () => {
      server.off('error', handleError)
      const address = server.address()

      if (!address || typeof address === 'string') {
        closeTestServer(server).then(
          () => reject(new Error('Test server did not bind to a TCP port.')),
          reject,
        )
        return
      }

      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        server,
      })
    }

    server.once('error', handleError)
    server.once('listening', handleListening)
  })
}

async function requestJson(baseUrl, path, options) {
  const response = await fetch(`${baseUrl}${path}`, options)
  const body = await response.json()

  return { body, response }
}

let baseUrl
let server

before(async () => {
  const testServer = await startTestServer()

  baseUrl = testServer.baseUrl
  server = testServer.server
})

after(async () => {
  await closeTestServer(server)
})

test('H-01 GET /api/health returns the exact public health response', async () => {
  const { body, response } = await requestJson(baseUrl, '/api/health')

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i)
  assert.equal(body !== null && typeof body === 'object' && !Array.isArray(body), true)
  assert.deepEqual(body, {
    status: 'ok',
    service: 'noticepilot-analyze-api',
  })
})

test('A-01 POST /api/analyze defaults an omitted mode to mock', async () => {
  const { body, response } = await requestJson(baseUrl, '/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      language: 'en',
      noticeTitle: 'HTTP contract notice',
      noticeText: 'Applications close on 2026-07-20.',
    }),
  })

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i)
  assert.equal(body !== null && typeof body === 'object' && !Array.isArray(body), true)

  const validationResult = safeParseAppAnalysis(body)

  assert.equal(
    validationResult.success,
    true,
    'Expected the default mock response to match AppAnalysisSchema.',
  )
  assert.equal(body.title, 'HTTP contract notice')
  assert.equal(
    body.warnings.some((warning) => warning.type === 'server_mock_analysis'),
    true,
  )
})

test('A-02 POST /api/analyze accepts explicit mock mode', async () => {
  const { body, response } = await requestJson(baseUrl, '/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'mock',
      language: 'ko',
      noticeTitle: 'HTTP 명시적 mock 계약',
      noticeText: '신청 마감일은 2026년 7월 20일입니다.',
      userPreferencesSnapshot: {
        selectedCampuses: [
          'dogye',
          'invalid-campus',
          'chuncheon',
          'dogye',
        ],
      },
    }),
  })

  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i)
  assert.equal(body !== null && typeof body === 'object' && !Array.isArray(body), true)

  const validationResult = safeParseAppAnalysis(body)

  assert.equal(
    validationResult.success,
    true,
    'Expected the explicit mock response to match AppAnalysisSchema.',
  )
  assert.equal(body.title, 'HTTP 명시적 mock 계약')
  assert.equal(
    body.metadata.userPreferencesSnapshot.activeInstitution,
    'kangwon',
  )
  assert.deepEqual(body.metadata.userPreferencesSnapshot.selectedCampuses, [
    'chuncheon',
    'dogye',
  ])
  assert.equal(
    body.metadata.userPreferencesSnapshot.includeCommonNotices,
    true,
  )
  assert.equal(
    body.warnings.some((warning) => warning.type === 'server_mock_analysis'),
    true,
  )
})

test('A-03 POST /api/analyze returns the exact AI-not-implemented error', async () => {
  const { body, response } = await requestJson(baseUrl, '/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'ai',
      noticeText: 'Applications close on 2026-07-20.',
    }),
  })

  assert.equal(response.status, 501)
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i)
  assert.equal(body !== null && typeof body === 'object' && !Array.isArray(body), true)
  assert.equal(
    body.error !== null &&
      typeof body.error === 'object' &&
      !Array.isArray(body.error),
    true,
  )

  for (const field of [
    'stack',
    'cause',
    'validationCode',
    'validationDetails',
    'statusCode',
    'publicMessage',
  ]) {
    assert.equal(Object.hasOwn(body, field), false)
    assert.equal(Object.hasOwn(body.error, field), false)
  }

  assert.deepEqual(body, {
    error: {
      type: 'ai_not_implemented',
      message:
        'Real AI analysis is not implemented in this phase. Use mode "mock" for the Express skeleton.',
    },
  })
})

test('A-04 POST /api/analyze returns the exact unsupported-mode error', async () => {
  const { body, response } = await requestJson(baseUrl, '/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'unsupported-test-mode',
      noticeText: 'Applications close on 2026-07-20.',
    }),
  })

  assert.equal(response.status, 400)
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i)
  assert.equal(body !== null && typeof body === 'object' && !Array.isArray(body), true)
  assert.equal(
    body.error !== null &&
      typeof body.error === 'object' &&
      !Array.isArray(body.error),
    true,
  )

  for (const field of [
    'stack',
    'cause',
    'validationCode',
    'validationDetails',
    'statusCode',
    'publicMessage',
  ]) {
    assert.equal(Object.hasOwn(body, field), false)
    assert.equal(Object.hasOwn(body.error, field), false)
  }

  assert.deepEqual(body, {
    error: {
      type: 'unsupported_mode',
      message: 'Unsupported analysis mode. Use "mock" or "ai".',
    },
  })
})

test('A-05 POST /api/analyze returns the exact invalid-JSON error', async () => {
  const { body, response } = await requestJson(baseUrl, '/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: '{"mode":"mock","noticeText":',
  })

  assert.equal(response.status, 400)
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i)
  assert.equal(body !== null && typeof body === 'object' && !Array.isArray(body), true)
  assert.equal(
    body.error !== null &&
      typeof body.error === 'object' &&
      !Array.isArray(body.error),
    true,
  )

  for (const field of [
    'stack',
    'cause',
    'body',
    'status',
    'statusCode',
    'type',
    'expose',
    'expected',
    'length',
    'limit',
    'received',
    'validationCode',
    'validationDetails',
    'publicMessage',
  ]) {
    assert.equal(Object.hasOwn(body, field), false)
  }

  for (const field of [
    'stack',
    'cause',
    'body',
    'status',
    'statusCode',
    'expose',
    'expected',
    'length',
    'limit',
    'received',
    'validationCode',
    'validationDetails',
    'publicMessage',
  ]) {
    assert.equal(Object.hasOwn(body.error, field), false)
  }

  assert.deepEqual(body, {
    error: {
      type: 'invalid_json',
      message: 'Request body contains invalid JSON.',
    },
  })
})

test('A-06 POST /api/analyze returns the exact request-too-large error', async () => {
  const oversizedBody = JSON.stringify({
    mode: 'mock',
    noticeText: 'x'.repeat(1024 * 1024 + 1024),
  })

  assert.ok(Buffer.byteLength(oversizedBody) > 1024 * 1024)

  const { body, response } = await requestJson(baseUrl, '/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: oversizedBody,
  })

  assert.equal(response.status, 413)
  assert.match(response.headers.get('content-type') || '', /^application\/json\b/i)
  assert.equal(body !== null && typeof body === 'object' && !Array.isArray(body), true)
  assert.equal(
    body.error !== null &&
      typeof body.error === 'object' &&
      !Array.isArray(body.error),
    true,
  )

  for (const field of [
    'stack',
    'cause',
    'body',
    'status',
    'statusCode',
    'type',
    'expose',
    'expected',
    'length',
    'limit',
    'received',
    'validationCode',
    'validationDetails',
    'publicMessage',
  ]) {
    assert.equal(Object.hasOwn(body, field), false)
  }

  for (const field of [
    'stack',
    'cause',
    'body',
    'status',
    'statusCode',
    'expose',
    'expected',
    'length',
    'limit',
    'received',
    'validationCode',
    'validationDetails',
    'publicMessage',
  ]) {
    assert.equal(Object.hasOwn(body.error, field), false)
  }

  assert.deepEqual(body, {
    error: {
      type: 'request_too_large',
      message: 'Request body exceeds the allowed size limit.',
    },
  })
})

test('A-07 POST /api/analyze returns the exact generic server error', async () => {
  const sentinel = 'A-07 synthetic internal failure sentinel'
  const requestBody = {
    mode: 'mock',
    noticeText: 'A valid notice body for internal failure testing.',
  }
  let dependencyCallCount = 0
  let dependencyInput
  const app = createApp({
    analyzeNotice: async (input) => {
      dependencyCallCount += 1
      dependencyInput = input

      const error = new Error(sentinel, {
        cause: new Error('A-07 internal cause'),
      })
      error.code = 'A07_INTERNAL_CODE'
      error.details = { internal: true }
      error.validationCode = 'A07_INTERNAL_VALIDATION'
      error.validationDetails = { internal: true }
      throw error
    },
  })
  const testServer = await startTestServer(app)

  try {
    const unsupportedResponse = await requestJson(
      testServer.baseUrl,
      '/api/analyze',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'unsupported-test-mode',
          noticeText: requestBody.noticeText,
        }),
      },
    )

    assert.equal(unsupportedResponse.response.status, 400)
    assert.deepEqual(unsupportedResponse.body, {
      error: {
        type: 'unsupported_mode',
        message: 'Unsupported analysis mode. Use "mock" or "ai".',
      },
    })
    assert.equal(dependencyCallCount, 0)

    const { body, response } = await requestJson(
      testServer.baseUrl,
      '/api/analyze',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    )

    assert.equal(response.status, 500)
    assert.match(
      response.headers.get('content-type') || '',
      /^application\/json\b/i,
    )
    assert.equal(
      body !== null && typeof body === 'object' && !Array.isArray(body),
      true,
    )
    assert.equal(
      body.error !== null &&
        typeof body.error === 'object' &&
        !Array.isArray(body.error),
      true,
    )

    for (const field of [
      'name',
      'stack',
      'cause',
      'code',
      'details',
      'status',
      'statusCode',
      'validationCode',
      'validationDetails',
      'publicMessage',
    ]) {
      assert.equal(Object.hasOwn(body, field), false)
      assert.equal(Object.hasOwn(body.error, field), false)
    }

    assert.deepEqual(body, {
      error: {
        type: 'server_error',
        message: 'The analysis server could not complete the request.',
      },
    })
    assert.notEqual(body.error.message, sentinel)
  } finally {
    await closeTestServer(testServer.server)
  }

  assert.equal(dependencyCallCount, 1)
  assert.deepEqual(dependencyInput, {
    mode: 'mock',
    requestBody,
  })
})
