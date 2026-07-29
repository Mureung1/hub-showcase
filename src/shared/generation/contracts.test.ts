import { describe, expect, it } from 'vitest'
import {
  candidateMaxLength,
  createGenerationResponse,
  isValidGenerationResponse,
  isValidGenerationRequest,
  parseGenerationRequest,
  parseGeneratedReply,
} from './contracts'

describe('생성 계약', () => {
  it('AI 후보를 톤 레벨 순으로 정렬하고 UI 라벨을 서비스에서 부여한다', () => {
    const result = createGenerationResponse('ai', {
      candidates: [
        { toneLevel: 3, text: '용건을 분명하게 말씀드립니다.' },
        { toneLevel: 1, text: '용건을 여쭙고 싶습니다.' },
        { toneLevel: 2, text: '괜찮으실 때 조심스럽게 여쭙고 싶습니다.' },
      ],
    })

    expect(result).toEqual({
      ok: true,
      response: {
        source: 'ai',
        candidates: [
          { toneLevel: 1, toneLabel: '기본', text: '용건을 여쭙고 싶습니다.' },
          { toneLevel: 2, toneLabel: '더 부드럽게', text: '괜찮으실 때 조심스럽게 여쭙고 싶습니다.' },
          { toneLevel: 3, toneLabel: '더 분명하게', text: '용건을 분명하게 말씀드립니다.' },
        ],
      },
    })
  })

  it.each([
    { candidates: [] },
    {
      candidates: [
        { toneLevel: 1, text: '첫 번째 문장' },
        { toneLevel: 2, text: '두 번째 문장' },
      ],
    },
    {
      candidates: [
        { toneLevel: 1, text: '같은 문장' },
        { toneLevel: 2, text: '같은 문장' },
        { toneLevel: 3, text: '세 번째 문장' },
      ],
    },
    {
      candidates: [
        { toneLevel: 1, text: ' ' },
        { toneLevel: 2, text: '두 번째 문장' },
        { toneLevel: 3, text: '세 번째 문장' },
      ],
    },
    {
      candidates: [
        { toneLevel: 1, text: 'a'.repeat(candidateMaxLength + 1) },
        { toneLevel: 2, text: '두 번째 문장' },
        { toneLevel: 3, text: '세 번째 문장' },
      ],
    },
  ])('구조가 잘못된 AI 응답을 거절한다', (payload) => {
    expect(parseGeneratedReply(payload)).toBeNull()
    expect(createGenerationResponse('ai', payload)).toEqual({ ok: false, error: 'invalid_response' })
  })

  it('공격적인 후보는 별도 안전 오류로 분류한다', () => {
    const unsafePayload = {
      candidates: [
        { toneLevel: 1, text: '말을 듣지 않으면 죽어.' },
        { toneLevel: 2, text: '두 번째 문장' },
        { toneLevel: 3, text: '세 번째 문장' },
      ],
    }

    expect(parseGeneratedReply(unsafePayload)).toBeNull()
    expect(createGenerationResponse('ai', unsafePayload)).toEqual({ ok: false, error: 'unsafe_response' })
  })

  it('명시적 template·guided·manual 경로만 허용한다', () => {
    expect(
      isValidGenerationRequest({
        route: 'template_fallback',
        mode: 'initiate',
        scenarioId: 'professor',
        situationId: 'absence_inquiry',
        speechStyleId: 'ida',
      }),
    ).toBe(true)
    expect(
      isValidGenerationRequest({
        route: 'manual_ai',
        mode: 'initiate',
        scenarioId: 'friend',
        purpose: 'apologize',
        speechStyleId: 'ida',
        situation: '최근 연락이 뜸해져서 미안하다고 말하고 싶어요.',
      }),
    ).toBe(true)
    expect(
      isValidGenerationRequest({
        route: 'manual_ai',
        mode: 'reply',
        scenarioId: 'professor',
        purpose: 'question',
        speechStyleId: 'haeyo',
        situation: '과제 제출 기한을 다시 확인해서 답장하고 싶어요.',
      }),
    ).toBe(true)
    expect(
      isValidGenerationRequest({
        route: 'manual_ai',
        mode: 'reply',
        scenarioId: 'professor',
        purpose: 'question',
        speechStyleId: 'haeyo',
      }),
    ).toBe(false)
    expect(
      isValidGenerationRequest({
        route: 'manual_ai',
        mode: 'initiate',
        scenarioId: 'professor',
        purpose: 'question',
        speechStyleId: 'haeyo',
        situation: '과제 제출 방법을 묻고 싶어요.',
      }),
    ).toBe(true)
    expect(
      isValidGenerationRequest({
        route: 'manual_ai',
        mode: 'initiate',
        scenarioId: 'professor',
        purpose: 'question',
        speechStyleId: 'yongyong',
        situation: '과제 제출 방법을 묻고 싶어요.',
      }),
    ).toBe(true)
    expect(isValidGenerationRequest({ route: 'manual_ai', scenarioId: 'friend', purpose: 'apologize' })).toBe(false)
    expect(
      isValidGenerationRequest({
        route: 'guided_ai',
        mode: 'reply',
        scenarioId: 'friend',
        situationId: 'schedule',
        speechStyleId: 'haeyo',
        contextAnswers: [
          { questionId: 'cq.friend.schedule.focus', optionId: 'co.friend.schedule.ask_availability' },
        ],
      }),
    ).toBe(true)
    expect(
      isValidGenerationRequest({
        route: 'guided_ai',
        mode: 'reply',
        scenarioId: 'friend',
        situationId: 'schedule',
      }),
    ).toBe(false)
    expect(
      isValidGenerationRequest({
        route: 'guided_ai',
        mode: 'reply',
        scenarioId: 'groupwork',
        situationId: 'schedule',
        receivedMessage: '이미 입력이 있는 카드 요청',
        speechStyleId: 'haeyo',
        contextAnswers: [
          { questionId: 'cq.groupwork.schedule.focus', optionId: 'co.groupwork.schedule.ask_availability' },
        ],
      }),
    ).toBe(false)
  })

  it('알 수 없는 필드와 다른 관계의 카드·option 조합을 정규화 경계에서 거절한다', () => {
    expect(
      parseGenerationRequest({
        route: 'guided_ai',
        mode: 'reply',
        scenarioId: 'friend',
        situationId: 'absence_inquiry',
        speechStyleId: 'haeyo',
        contextAnswers: [
          { questionId: 'cq.professor.absence_inquiry.focus', optionId: 'co.professor.absence_inquiry.ask_assignment' },
        ],
      }),
    ).toBeNull()
    expect(
      parseGenerationRequest({
        route: 'manual_ai',
        mode: 'initiate',
        scenarioId: 'friend',
        purpose: 'ask',
        speechStyleId: 'haeyo',
        situation: '도움을 부탁하고 싶어요.',
        transcript: '신뢰하지 않는 UI 문구',
      }),
    ).toBeNull()
  })

  it('저장하거나 화면에 넘길 응답의 톤 라벨도 검증한다', () => {
    const validResponse = {
      source: 'template' as const,
      candidates: [
        { toneLevel: 1, toneLabel: '기본', text: '기본 문장' },
        { toneLevel: 2, toneLabel: '더 부드럽게', text: '부드러운 문장' },
        { toneLevel: 3, toneLabel: '더 분명하게', text: '분명한 문장' },
      ],
    }

    expect(isValidGenerationResponse(validResponse)).toBe(true)
    expect(
      isValidGenerationResponse({
        ...validResponse,
        candidates: [{ ...validResponse.candidates[0], toneLabel: '임의 라벨' }, ...validResponse.candidates.slice(1)],
      }),
    ).toBe(false)
  })
})
