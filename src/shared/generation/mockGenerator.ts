import type { ScenarioId } from '../../entities/message'
import {
  createGenerationResponse,
  isValidGenerationRequest,
  type GeneratedReply,
  type GenerationRequest,
  type GenerationResult,
} from './contracts'

export type MockGenerationCase = 'normal' | 'delay' | 'error500' | 'error429'

export const mockDelayMs = 25_000

const mockReplies: Record<ScenarioId, GeneratedReply> = {
  groupwork: {
    candidates: [
      { toneLevel: 1, text: '상황을 확인하고 필요한 내용을 함께 조율해보자는 메시지예요.' },
      { toneLevel: 2, text: '바쁜 사정을 배려하면서도 필요한 내용을 조심스럽게 부탁하는 메시지예요.' },
      { toneLevel: 3, text: '필요한 행동과 확인 시점을 분명하게 전달하는 메시지예요.' },
    ],
  },
  professor: {
    candidates: [
      { toneLevel: 1, text: '안녕하세요. 상황을 설명드리고 확인을 부탁드리고 싶습니다. 감사합니다.' },
      { toneLevel: 2, text: '안녕하세요. 바쁘신 중에 조심스럽게 상황을 말씀드리며 확인을 부탁드립니다. 감사합니다.' },
      { toneLevel: 3, text: '안녕하세요. 상황을 말씀드리며 필요한 확인을 부탁드립니다. 감사합니다.' },
    ],
  },
  senior: {
    candidates: [
      { toneLevel: 1, text: '선배님, 상황을 확인하고 싶어 연락드렸어요.' },
      { toneLevel: 2, text: '선배님, 바쁘신데 죄송하지만 괜찮으실 때 상황을 확인해도 될까요?' },
      { toneLevel: 3, text: '선배님, 상황 확인 부탁드립니다.' },
    ],
  },
  friend: {
    candidates: [
      { toneLevel: 1, text: '내 마음을 솔직하게 전하고 싶어.' },
      { toneLevel: 2, text: '조심스럽지만 내 마음을 잘 전하고 싶어.' },
      { toneLevel: 3, text: '내 마음을 분명하게 전하고 싶어.' },
    ],
  },
}

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })

export const generateWithMock = async (
  request: GenerationRequest,
  generationCase: MockGenerationCase = 'normal',
): Promise<GenerationResult> => {
  if (!isValidGenerationRequest(request) || request.situationId !== undefined) {
    return { ok: false, error: 'invalid_request' }
  }

  if (generationCase === 'error429') return { ok: false, error: 'rate_limited' }
  if (generationCase === 'error500') return { ok: false, error: 'generation_failed' }
  if (generationCase === 'delay') await wait(mockDelayMs)

  return createGenerationResponse('ai', mockReplies[request.scenarioId])
}
