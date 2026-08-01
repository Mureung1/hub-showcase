import test from 'node:test'
import assert from 'node:assert/strict'
import { createReportAnalysis, createSummary } from '../services/summaryService.js'

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
  // reason 필드가 없는 응답이어도 AI 결과로 인정하고 빈 문자열로 채운다
  assert.equal(result.emotionReason, '')
})

test('passes reason fields through when the AI response includes them', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          emotion: '답답함',
          cause: '새로운 도구가 익숙하지 않은 상황',
          action: '연결 순서를 한 줄로 적어둔다.',
          emotionReason: '"막혔다"는 표현에서 답답함을 정리했어요.',
          causeReason: '도구 이야기가 원인으로 언급됐어요.',
          actionReason: '바로 해볼 수 있는 작은 행동으로 좁혔어요.',
        }),
      },
    }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  const result = await createSummary('오늘 새로운 도구 때문에 막혔다.', { fetchImpl })

  assert.equal(result.source, 'ai')
  assert.equal(result.emotionReason, '"막혔다"는 표현에서 답답함을 정리했어요.')
  assert.equal(result.causeReason, '도구 이야기가 원인으로 언급됐어요.')
  assert.equal(result.actionReason, '바로 해볼 수 있는 작은 행동으로 좁혔어요.')
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

test('returns a bounded analysis for an emotion report', async () => {
  let requestBody
  const fetchImpl = async (_url, options) => {
    requestBody = JSON.parse(options.body)
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            overview: '최근 기록에서는 긴장과 안도가 차례로 나타났어요.',
            pattern: '발표 준비가 원인으로 반복해서 기록됐어요.',
            nextFocus: '긴장이 줄어든 날에는 어떤 작은 행동이 있었는지 살펴볼까요?',
          }),
        },
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const reportText = '기록 기간: 7월 28일 ~ 7월 30일\n기분 분포: 😐 2회, 🙂 1회'
  const result = await createReportAnalysis(reportText, { fetchImpl })

  assert.equal(result.source, 'ai')
  assert.equal(result.overview, '최근 기록에서는 긴장과 안도가 차례로 나타났어요.')
  assert.equal(result.pattern, '발표 준비가 원인으로 반복해서 기록됐어요.')
  assert.match(requestBody.messages[0].content, /진단/)
  assert.equal(requestBody.messages[1].content, reportText)
})
