import test from 'node:test'
import assert from 'node:assert/strict'
import { createSummary } from '../services/summaryService.js'

test('returns validated AI summary from an OpenAI-compatible response', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          emotion: '답답함',
          cause: '새로운 도구가 익숙하지 않은 상황',
          action: '연결 순서를 한 줄로 적어둔다.',
        }),
      },
    }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  const result = await createSummary('오늘 새로운 도구 때문에 막혔다.', { fetchImpl })

  assert.equal(result.source, 'ai')
  assert.equal(result.emotion, '답답함')
  assert.equal(result.cause, '새로운 도구가 익숙하지 않은 상황')
  assert.equal(result.action, '연결 순서를 한 줄로 적어둔다.')
})

test('falls back to mock when the gateway request fails', async () => {
  let callCount = 0
  const fetchImpl = async () => {
    callCount += 1
    throw new Error('gateway offline')
  }

  const result = await createSummary('오늘 새로운 도구 때문에 막혔다.', { fetchImpl })

  assert.equal(result.source, 'mock')
  assert.equal(result.emotion, '정리되지 않은 피로감')
  assert.equal(callCount, 2)
})

test('retries once when the first AI response is not valid JSON', async () => {
  let callCount = 0
  const fetchImpl = async () => {
    callCount += 1
    const content = callCount === 1
      ? 'JSON 형식이 아닌 응답'
      : JSON.stringify({ emotion: '긴장감', cause: '새로운 환경', action: '순서를 적는다.' })

    return new Response(JSON.stringify({
      choices: [{ message: { content } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const result = await createSummary('새로운 환경이라 긴장했다.', { fetchImpl })

  assert.equal(result.source, 'ai')
  assert.equal(result.emotion, '긴장감')
  assert.equal(callCount, 2)
})
