import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockDelayMs, generateWithMock } from './mockGenerator'

const request = {
  scenarioId: 'professor' as const,
  purpose: 'question' as const,
  speechStyleId: 'seumnida' as const,
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
    ['seumnida', '상황을 확인하고 제 마음을 전하고 싶습니다.'],
    ['haeyo', '상황을 확인하고 내 마음을 전하고 싶어요'],
    ['ida', '상황을 확인하고 내 마음을 전하고 싶다.'],
    ['yongyong', '상황을 확인하고 내 마음을 전하고 싶어용'],
  ] as const)('%s 선택을 세 톤 후보의 말끝에 반영한다', async (speechStyleId, expectedText) => {
    const result = await generateWithMock({
      scenarioId: 'friend',
      purpose: 'question',
      speechStyleId,
      situation: '약속 시간을 확인하고 싶어',
    })

    expect(result).toMatchObject({
      ok: true,
      response: {
        candidates: [
          { text: expectedText, toneLevel: 1 },
          { toneLevel: 2 },
          { toneLevel: 3 },
        ],
      },
    })
  })

  it.each(
    (['groupwork', 'professor', 'senior', 'friend'] as const).flatMap((scenarioId) =>
      (['seumnida', 'haeyo', 'ida', 'yongyong'] as const).map(
        (speechStyleId) => [scenarioId, speechStyleId] as const,
      ),
    ),
  )('%s 관계의 %s 말투 요청에 세 톤 후보를 반환한다', async (scenarioId, speechStyleId) => {
    const result = await generateWithMock({
      scenarioId,
      purpose: 'other',
      speechStyleId,
      situation: '상황을 설명하고 싶어요',
    })

    expect(result).toMatchObject({
      ok: true,
      response: {
        candidates: [
          { toneLevel: 1 },
          { toneLevel: 2 },
          { toneLevel: 3 },
        ],
      },
    })
  })

  it('같은 말투여도 관계가 다르면 관계별 후보를 반환한다', async () => {
    const groupworkResult = await generateWithMock({
      scenarioId: 'groupwork',
      purpose: 'ask',
      speechStyleId: 'haeyo',
      situation: '팀 진행 상황을 확인하고 싶어요',
    })
    const professorResult = await generateWithMock({
      scenarioId: 'professor',
      purpose: 'ask',
      speechStyleId: 'haeyo',
      situation: '과제 진행 상황을 확인하고 싶어요',
    })

    expect(groupworkResult.ok).toBe(true)
    expect(professorResult.ok).toBe(true)
    if (!groupworkResult.ok || !professorResult.ok) return

    expect(groupworkResult.response.candidates[0]?.text).toContain('팀 진행 상황')
    expect(professorResult.response.candidates[0]?.text).toContain('안녕하세요')
    expect(groupworkResult).not.toEqual(professorResult)
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
        speechStyleId: 'haeyo',
      }),
    ).resolves.toEqual({ ok: false, error: 'invalid_request' })
  })

  it('말투가 없는 요청을 거절한다', async () => {
    await expect(
      generateWithMock({
        scenarioId: 'professor',
        purpose: 'question',
        situation: '과제 제출 방법을 확인하고 싶습니다.',
      }),
    ).resolves.toEqual({
      ok: false,
      error: 'invalid_request',
    })
  })
})
