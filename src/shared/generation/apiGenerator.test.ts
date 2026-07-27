import { describe, expect, it, vi } from 'vitest'
import {
  generateWithApi,
  type GenerationFetch,
} from './apiGenerator.js'
import type { GenerationRequest, GenerationResponse } from './contracts.js'

const manualRequest: GenerationRequest = {
  mode: 'initiate',
  purpose: 'apologize',
  route: 'manual_ai',
  scenarioId: 'friend',
  speechStyleId: 'haeyo',
  situation: '약속을 미뤄야겠다 그리고 정중하게 사과하고싶다',
}

const validResponse: GenerationResponse = {
  candidates: [
    { text: '약속을 미뤄야 할 것 같아 미안해요.', toneLabel: '기본', toneLevel: 1 },
    { text: '정말 미안하지만 약속을 조금 미뤄도 괜찮을까요?', toneLabel: '더 부드럽게', toneLevel: 2 },
    { text: '미안해요. 이번 약속은 미뤄야 할 것 같아요.', toneLabel: '더 분명하게', toneLevel: 3 },
  ],
  source: 'ai',
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
    status,
  })

describe('generateWithApi', () => {
  it('same-origin API에 자연어 입력을 손실 없이 POST하고 strict AI 응답을 반환한다', async () => {
    const fetcher = vi.fn<GenerationFetch>().mockResolvedValue(jsonResponse(validResponse))

    const result = await generateWithApi(manualRequest, fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('/api/generate', {
      body: JSON.stringify(manualRequest),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    expect(result).toEqual({ ok: true, response: validResponse })
  })

  it('로컬 template fallback은 서버에 보내지 않는다', async () => {
    const fetcher = vi.fn<GenerationFetch>()

    const result = await generateWithApi(
      {
        mode: 'initiate',
        route: 'template_fallback',
        scenarioId: 'friend',
        situationId: 'schedule',
        speechStyleId: 'haeyo',
      },
      fetcher,
    )

    expect(result).toEqual({ ok: false, error: 'invalid_request' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    [400, 'invalid_request'],
    [429, 'rate_limited'],
    [500, 'generation_failed'],
  ] as const)('HTTP %s를 공개 오류 %s로 매핑한다', async (status, error) => {
    const fetcher = vi
      .fn<GenerationFetch>()
      .mockResolvedValue(jsonResponse({ error }, status))

    await expect(generateWithApi(manualRequest, fetcher)).resolves.toEqual({
      ok: false,
      error,
    })
  })

  it('서버의 허용된 안전 오류를 보존한다', async () => {
    const fetcher = vi
      .fn<GenerationFetch>()
      .mockResolvedValue(jsonResponse({ error: 'unsafe_response' }, 500))

    await expect(generateWithApi(manualRequest, fetcher)).resolves.toEqual({
      ok: false,
      error: 'unsafe_response',
    })
  })

  it('network 실패는 생성 실패로 정규화한다', async () => {
    const fetcher = vi.fn<GenerationFetch>().mockRejectedValue(new Error('network unavailable'))

    await expect(generateWithApi(manualRequest, fetcher)).resolves.toEqual({
      ok: false,
      error: 'generation_failed',
    })
  })

  it.each([
    ['JSON이 아닌 성공 응답', new Response('not-json', { status: 200 })],
    ['계약이 다른 성공 응답', jsonResponse({ source: 'ai', candidates: [] })],
    ['template source 성공 응답', jsonResponse({ ...validResponse, source: 'template' })],
  ])('%s은 invalid_response로 거절한다', async (_label, response) => {
    const fetcher = vi.fn<GenerationFetch>().mockResolvedValue(response)

    await expect(generateWithApi(manualRequest, fetcher)).resolves.toEqual({
      ok: false,
      error: 'invalid_response',
    })
  })
})
