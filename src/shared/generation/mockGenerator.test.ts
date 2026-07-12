import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockDelayMs, generateWithMock } from './mockGenerator'

const request = {
  scenarioId: 'professor' as const,
  purpose: 'question' as const,
  situation: '과제 제출 방법을 확인하고 싶습니다.',
}

afterEach(() => {
  vi.useRealTimers()
})

describe('개발용 목 생성기', () => {
  it('정상 요청에 공용 생성 계약을 반환한다', async () => {
    await expect(generateWithMock(request)).resolves.toMatchObject({
      ok: true,
      response: {
        source: 'ai',
        candidates: [
          { toneLevel: 1, toneLabel: '기본' },
          { toneLevel: 2, toneLabel: '더 부드럽게' },
          { toneLevel: 3, toneLabel: '더 분명하게' },
        ],
      },
    })
  })

  it.each([
    ['error500', 'generation_failed'],
    ['error429', 'rate_limited'],
  ] as const)('강제 %s 상태를 반환한다', async (generationCase, expectedError) => {
    await expect(generateWithMock(request, generationCase)).resolves.toEqual({
      ok: false,
      error: expectedError,
    })
  })

  it('지연 상태를 타임아웃 UI 검증에 쓸 수 있게 유지한다', async () => {
    vi.useFakeTimers()
    const pendingResult = generateWithMock(request, 'delay')

    await vi.advanceTimersByTimeAsync(mockDelayMs - 1)
    let settled = false
    void pendingResult.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await expect(pendingResult).resolves.toMatchObject({ ok: true })
  })

  it('카드 요청을 AI 목 경로로 보내지 않는다', async () => {
    await expect(
      generateWithMock({
        scenarioId: 'professor',
        situationId: 'absence_inquiry',
      }),
    ).resolves.toEqual({ ok: false, error: 'invalid_request' })
  })
})
