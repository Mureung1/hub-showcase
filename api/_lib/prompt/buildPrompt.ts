import { isValidGenerationRequest } from '../../../src/shared/generation/contracts'
import type { AiGenerationRequest } from '../generation/provider'
import { requirePromptExamplePair, type PromptExampleSet } from './examples'
import { generatedReplyOutputConfig } from './outputSchema'
import { relationshipRules } from './relationshipRules'
import { speechStyleRules } from './speechStyleRules'
import { situationRules } from './situationRules'
import { systemPrompt } from './systemPrompt'

export type BuiltPrompt = {
  readonly system: string
  readonly messages: readonly [{ readonly role: 'user'; readonly content: string }]
  readonly output_config: typeof generatedReplyOutputConfig
}

export const escapeXmlText = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const renderOptionalData = (tagName: 'received_message' | 'situation', value?: string) => {
  const normalized = value?.trim()
  return normalized ? `<${tagName}>${escapeXmlText(normalized)}</${tagName}>` : null
}

const renderExampleSet = (exampleSet: PromptExampleSet, index: number) => {
  const receivedMessage = renderOptionalData('received_message', exampleSet.receivedMessage)
  const candidates = exampleSet.candidates.map(
    (candidate) =>
      `<candidate tone_level="${candidate.toneLevel}">${escapeXmlText(candidate.text)}</candidate>`,
  )

  return [
    `<example_set index="${index}">`,
    `<scenario_id>${exampleSet.scenarioId}</scenario_id>`,
    `<purpose_id>${exampleSet.purpose}</purpose_id>`,
    receivedMessage,
    `<situation>${escapeXmlText(exampleSet.situation)}</situation>`,
    ...candidates,
    '</example_set>',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

const buildUserContent = (
  request: AiGenerationRequest,
  exampleSets: readonly PromptExampleSet[],
) => {
  const examples = requirePromptExamplePair(request.scenarioId, exampleSets)
  const receivedMessage = renderOptionalData('received_message', request.receivedMessage)
  const situation = renderOptionalData('situation', request.situation)

  return [
    '<examples>',
    ...examples.map((exampleSet, index) => renderExampleSet(exampleSet, index + 1)),
    '</examples>',
    '<current_input>',
    `<scenario_id>${request.scenarioId}</scenario_id>`,
    `<purpose_id>${request.purpose}</purpose_id>`,
    `<speech_style_id>${request.speechStyleId}</speech_style_id>`,
    receivedMessage,
    situation,
    '</current_input>',
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

export const buildPrompt = (
  request: AiGenerationRequest,
  exampleSets: readonly PromptExampleSet[],
): BuiltPrompt => {
  if (
    !isValidGenerationRequest(request) ||
    request.situationId !== undefined ||
    request.purpose === undefined ||
    request.speechStyleId === undefined
  ) {
    throw new Error('Prompt request must satisfy the AI generation contract')
  }

  const system = [
    systemPrompt,
    `[관계 규칙]\n${relationshipRules[request.scenarioId]}`,
    `[목적 규칙]\n${situationRules[request.purpose]}`,
    `[개인 말투 규칙]\n${speechStyleRules[request.speechStyleId]}`,
    '[말투 적용 우선순위]\n관계 규칙의 존칭·높임·예의·상대 선택권은 유지한다. 종결 말끝은 현재 입력의 speech_style_id를 따르며, 관계 규칙의 기본 말끝이나 few-shot 예시의 말끝과 다르면 현재 선택을 우선한다.',
    '[출력 규칙]\ntoneLevel 1은 기본, 2는 더 부드럽게, 3은 더 분명하게다. 각 단계를 정확히 한 번씩 포함하고 JSON Schema를 지킨다.',
  ].join('\n\n')

  return {
    system,
    messages: [{ role: 'user', content: buildUserContent(request, exampleSets) }],
    output_config: generatedReplyOutputConfig,
  }
}
