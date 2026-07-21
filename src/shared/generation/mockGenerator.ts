import {
  resolveGuidedContext,
  type ScenarioId,
  type SpeechStyleId,
} from '../../entities/message/index.js'
import {
  createGenerationResponse,
  isValidGenerationRequest,
  type GeneratedReply,
  type GenerationRequest,
  type GenerationResult,
} from './contracts.js'

export type MockGenerationCase = 'normal' | 'delay' | 'error500' | 'error429'

export const mockDelayMs = 25_000

const mockReplies: Record<ScenarioId, Record<SpeechStyleId, GeneratedReply>> = {
  groupwork: {
    seumnida: {
      candidates: [
        { toneLevel: 1, text: '팀 진행 상황을 확인하고 필요한 내용을 함께 조율하고 싶습니다.' },
        { toneLevel: 2, text: '괜찮으시다면 팀 진행 상황을 함께 확인하고 조율해 주시면 감사하겠습니다.' },
        { toneLevel: 3, text: '팀 진행 상황과 필요한 내용을 확인해 주시기 바랍니다.' },
      ],
    },
    haeyo: {
      candidates: [
        { toneLevel: 1, text: '팀 진행 상황을 확인하고 필요한 내용을 같이 조율하고 싶어요' },
        { toneLevel: 2, text: '괜찮으시면 팀 진행 상황을 같이 확인하고 천천히 조율해요' },
        { toneLevel: 3, text: '팀 진행 상황과 필요한 내용을 확인해 주세요' },
      ],
    },
    ida: {
      candidates: [
        { toneLevel: 1, text: '팀 진행 상황을 확인하고 필요한 내용을 함께 조율하고 싶다.' },
        { toneLevel: 2, text: '괜찮다면 팀 진행 상황을 함께 확인하고 천천히 조율하고 싶다.' },
        { toneLevel: 3, text: '팀 진행 상황과 필요한 내용을 확인하고 함께 조율하자.' },
      ],
    },
    yongyong: {
      candidates: [
        { toneLevel: 1, text: '팀 진행 상황을 확인하고 필요한 내용을 같이 조율하고 싶어용' },
        { toneLevel: 2, text: '괜찮으시면 팀 진행 상황을 같이 확인하고 천천히 조율해용' },
        { toneLevel: 3, text: '팀 진행 상황과 필요한 내용을 확인해 주세용' },
      ],
    },
  },
  professor: {
    seumnida: {
      candidates: [
        { toneLevel: 1, text: '안녕하세요. 상황을 설명드리고 확인을 부탁드리고 싶습니다. 감사합니다.' },
        { toneLevel: 2, text: '안녕하세요. 바쁘신 중에 조심스럽게 상황을 말씀드리며 확인을 부탁드립니다. 감사합니다.' },
        { toneLevel: 3, text: '안녕하세요. 상황을 말씀드리며 필요한 확인을 부탁드립니다. 감사합니다.' },
      ],
    },
    haeyo: {
      candidates: [
        { toneLevel: 1, text: '안녕하세요. 상황을 설명드리고 확인을 부탁드려도 될까요?' },
        { toneLevel: 2, text: '안녕하세요. 괜찮으실 때 상황을 확인해 주시면 감사할 것 같아요.' },
        { toneLevel: 3, text: '안녕하세요. 상황을 말씀드려요. 필요한 내용을 확인해 주세요.' },
      ],
    },
    ida: {
      candidates: [
        { toneLevel: 1, text: '안녕하세요. 상황을 설명드리고 확인을 부탁드리고자 한다.' },
        { toneLevel: 2, text: '안녕하세요. 괜찮으실 때 상황을 확인해 주시면 감사하겠다.' },
        { toneLevel: 3, text: '안녕하세요. 필요한 내용을 확인해 주실 수 있는지 여쭙는다.' },
      ],
    },
    yongyong: {
      candidates: [
        { toneLevel: 1, text: '안녕하세요. 상황을 설명드리고 확인을 부탁드려용.' },
        { toneLevel: 2, text: '안녕하세요. 괜찮으실 때 상황을 확인해 주시면 감사드려용.' },
        { toneLevel: 3, text: '안녕하세요. 필요한 내용을 확인해 주세용.' },
      ],
    },
  },
  senior: {
    seumnida: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 싶어 연락드렸습니다.' },
        { toneLevel: 2, text: '바쁘신데 죄송하지만 괜찮으실 때 상황을 확인해도 될까요?' },
        { toneLevel: 3, text: '상황 확인을 부탁드립니다.' },
      ],
    },
    haeyo: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 싶어 연락드렸어요' },
        { toneLevel: 2, text: '바쁘신데 죄송하지만 괜찮으실 때 상황을 확인해도 될까요?' },
        { toneLevel: 3, text: '상황 확인 부탁드려요' },
      ],
    },
    ida: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 싶어 연락드린다.' },
        { toneLevel: 2, text: '바쁘시겠지만 괜찮으실 때 상황을 확인해 주시면 감사하겠다.' },
        { toneLevel: 3, text: '상황 확인을 부탁드린다.' },
      ],
    },
    yongyong: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 싶어 연락드렸어용' },
        { toneLevel: 2, text: '바쁘신데 죄송하지만 괜찮으실 때 상황을 확인해도 될까용?' },
        { toneLevel: 3, text: '상황 확인 부탁드려용' },
      ],
    },
  },
  friend: {
    seumnida: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 제 마음을 전하고 싶습니다.' },
        { toneLevel: 2, text: '괜찮으시다면 상황을 함께 확인하고 천천히 이야기하고 싶습니다.' },
        { toneLevel: 3, text: '필요한 내용을 확인하고 제 마음을 분명히 말씀드리겠습니다.' },
      ],
    },
    haeyo: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 내 마음을 전하고 싶어요' },
        { toneLevel: 2, text: '괜찮다면 상황을 같이 확인하고 천천히 이야기하고 싶어요' },
        { toneLevel: 3, text: '필요한 내용을 확인하고 내 마음을 분명히 말할게요' },
      ],
    },
    ida: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 내 마음을 전하고 싶다.' },
        { toneLevel: 2, text: '괜찮다면 상황을 같이 확인하고 천천히 이야기하고 싶다.' },
        { toneLevel: 3, text: '필요한 내용을 확인하고 내 마음을 분명히 말한다.' },
      ],
    },
    yongyong: {
      candidates: [
        { toneLevel: 1, text: '상황을 확인하고 내 마음을 전하고 싶어용' },
        { toneLevel: 2, text: '괜찮다면 상황을 같이 확인하고 천천히 이야기하고 싶어용' },
        { toneLevel: 3, text: '필요한 내용을 확인하고 내 마음을 분명히 말할게용' },
      ],
    },
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
  if (
    !isValidGenerationRequest(request) ||
    request.route === 'template_fallback' ||
    (request.route === 'guided_ai' &&
      resolveGuidedContext(request.scenarioId, request.situationId, request.contextAnswers) === null)
  ) {
    return { ok: false, error: 'invalid_request' }
  }

  if (generationCase === 'error429') return { ok: false, error: 'rate_limited' }
  if (generationCase === 'error500') return { ok: false, error: 'generation_failed' }
  if (generationCase === 'delay') await wait(mockDelayMs)

  return createGenerationResponse('ai', mockReplies[request.scenarioId][request.speechStyleId])
}
