import {
  templateSpeechStyleOrder,
  templateToneOrder,
  type TemplateIntentId,
  type TemplateRule,
} from './contracts.js'
import type { SpeechStyleId, ToneLevel } from '../message.js'

type SpeechBoundaryPolicy = {
  description: string
  markerAtBoundary: RegExp
}

type ToneBoundaryPolicy = {
  description: string
  maximumLengthComparedWithTone?: ToneLevel
  requiredSoftenerMarker?: RegExp
  requiresIntentMarker: true
}

export type TemplatePolicyRule = TemplateRule & {
  speechBoundary: SpeechBoundaryPolicy
  toneBoundary: ToneBoundaryPolicy
}

const speechBoundaries: Record<SpeechStyleId, SpeechBoundaryPolicy> = {
  seumnida: {
    description: '습니다체 종결 표지는 문장부호 또는 문자열 끝 경계에 있어야 한다',
    markerAtBoundary: /(?:습니다|습니까|합니다|합니까|십니까|입니다|입니까)(?:[.!?]|$)/u,
  },
  haeyo: {
    description: '요체 종결 표지는 문장부호 또는 문자열 끝 경계에 있어야 한다',
    markerAtBoundary: /요(?:[.!?]|$)/u,
  },
  ida: {
    description: '이다체 평서·의문 종결 표지는 문장부호 또는 문자열 끝 경계에 있어야 한다',
    markerAtBoundary: /(?:다(?:[.!?]|$)|(까|어|래)\?)/u,
  },
  yongyong: {
    description: '용용체 종결 표지는 문장부호 또는 문자열 끝 경계에 있어야 한다',
    markerAtBoundary: /용(?:[.!?]|$)/u,
  },
}

const toneBoundaries: Record<ToneLevel, ToneBoundaryPolicy> = {
  1: {
    description: '기본 톤은 프레임의 핵심 화행 표지를 유지해야 한다',
    requiresIntentMarker: true,
  },
  2: {
    description: '더 부드러운 톤은 핵심 화행과 승인된 부담 완화 표지를 함께 가져야 한다',
    requiredSoftenerMarker:
      /(?:괜찮|편하|편할|가능|바쁘지|시간 되실 때|덕분|살펴봐|정말|기다리게|미안하지만|미안한데|죄송하지만)/u,
    requiresIntentMarker: true,
  },
  3: {
    description: '더 분명한 톤은 핵심 화행을 유지하고 더 부드러운 톤보다 길지 않아야 한다',
    maximumLengthComparedWithTone: 2,
    requiresIntentMarker: true,
  },
}

export const templateIntentMarkers: Record<
  TemplateIntentId,
  { description: string; pattern: RegExp }
> = {
  acknowledge: {
    description: '확인 사실과 감사 화행',
    pattern: /(?:(?:확인|봤|보았다|살펴봐).*(?:감사|고맙|고마)|덕분.*(?:확인|감사|고맙|고마))/u,
  },
  apologize_for_late_reply: {
    description: '늦은 답장 사실과 사과 화행',
    pattern: /^(?=.*답)(?=.*늦)(?=.*(?:미안|죄송))/u,
  },
  coordinate_schedule: {
    description: '시간 조율 화행',
    pattern: /(?:시간.*(?:괜찮|가능|언제|알려|정|맞)|언제.*(?:볼|괜찮))/u,
  },
  decline: { description: '거절 화행', pattern: /(?:어렵|어려)/u },
  express_affection: {
    description: '함께 있고 싶은 긍정 감정 화행',
    pattern: /(?:함께|같이).*좋/u,
  },
  inquire_absence_assignment: {
    description: '결석 사실과 과제 제출 방법 문의 화행',
    pattern: /결석.*과제 제출 방법/u,
  },
  invite_casual_speech: {
    description: '편한 말투 사용 제안 화행',
    pattern: /(?:말.*편하게|편하게.*(?:말|말씀))/u,
  },
  request: { description: '명시적 부탁 자리 표시자', pattern: /\[부탁할 내용\]/u },
  request_progress: {
    description: '맡은 부분의 진행 상황 확인 화행',
    pattern: /(?:진행 상황|어디까지 진행)/u,
  },
}

export const templateRules: readonly TemplatePolicyRule[] = templateSpeechStyleOrder.flatMap(
  (speechStyleId) =>
    templateToneOrder.map((toneLevel) => ({
      forbiddenSlots: [],
      id: `speech.${speechStyleId}.tone.${toneLevel}`,
      requiredSlots: ['coreIntent'],
      speechBoundary: speechBoundaries[speechStyleId],
      speechStyleId,
      toneBoundary: toneBoundaries[toneLevel],
      toneLevel,
    })),
)
