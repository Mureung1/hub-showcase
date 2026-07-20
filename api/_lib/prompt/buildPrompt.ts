import {
  guidedContextCatalogVersion,
  guidedContextQuestionFor,
} from '../../../src/entities/message/guidedContext'
import { parseGenerationRequest } from '../../../src/shared/generation/contracts'
import type { AiGenerationRequest } from '../generation/provider'
import { requirePromptExamplePair, type PromptExampleSet } from './examples'
import { generatedReplyOutputConfig } from './outputSchema'
import { relationshipRules } from './relationshipRules'
import { reviewedPromptExamplesFor } from './seedExamples'
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

const buildManualUserContent = (
  request: AiGenerationRequest,
  exampleSets: readonly PromptExampleSet[],
) => {
  if (request.route !== 'manual_ai') {
    throw new Error('Manual prompt request must use the manual AI route')
  }
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

const buildGuidedUserContent = (
  request: AiGenerationRequest,
  exampleSets: readonly PromptExampleSet[],
) => {
  if (request.route !== 'guided_ai') {
    throw new Error('Guided prompt request must use the guided AI route')
  }
  const examples = requirePromptExamplePair(request.scenarioId, exampleSets)

  return [
    '<examples>',
    ...examples.map((exampleSet, index) => renderExampleSet(exampleSet, index + 1)),
    '</examples>',
    '<current_input>',
    `<scenario_id>${request.scenarioId}</scenario_id>`,
    `<purpose_id>${request.purpose}</purpose_id>`,
    `<speech_style_id>${request.speechStyleId}</speech_style_id>`,
    `<mode>${request.mode}</mode>`,
    `<situation_id>${request.situationId}</situation_id>`,
    '<context_facts>',
    ...request.guidedContext.promptFacts.map(
      (fact) => `<context_fact>${escapeXmlText(fact)}</context_fact>`,
    ),
    '</context_facts>',
    '</current_input>',
  ].join('\n')
}

const isTrustedGuidedRequest = (request: AiGenerationRequest) => {
  if (request.route !== 'guided_ai') return false
  const question = guidedContextQuestionFor(request.scenarioId, request.situationId)
  const questionId = request.guidedContext.questionIds[0]
  const optionId = request.guidedContext.optionIds[0]
  const promptFact = request.guidedContext.promptFacts[0]
  const option = question?.options.find((candidate) => candidate.id === optionId)

  return (
    request.guidedContext.catalogVersion === guidedContextCatalogVersion &&
    request.guidedContext.purposeId === request.purpose &&
    request.guidedContext.questionIds.length === 1 &&
    request.guidedContext.optionIds.length === 1 &&
    request.guidedContext.promptFacts.length === 1 &&
    question?.id === questionId &&
    question.purposeId === request.purpose &&
    option?.promptFact === promptFact
  )
}

const isValidAiGenerationRequest = (request: AiGenerationRequest) => {
  if (request.route === 'guided_ai') return isTrustedGuidedRequest(request)
  return parseGenerationRequest(request)?.route === 'manual_ai'
}

export const buildPrompt = (
  request: AiGenerationRequest,
  exampleSets: readonly PromptExampleSet[],
): BuiltPrompt => {
  if (!isValidAiGenerationRequest(request)) {
    throw new Error('Prompt request must satisfy the AI generation contract')
  }

  const system = [
    systemPrompt,
    `[관계 규칙]\n${relationshipRules[request.scenarioId]}`,
    `[목적 규칙]\n${situationRules[request.purpose]}`,
    `[개인 말투 규칙]\n${speechStyleRules[request.speechStyleId]}`,
    '[말투 적용 우선순위]\n관계 규칙의 존칭·높임·예의·상대 선택권은 유지한다. 종결 말끝은 현재 입력의 speech_style_id를 따르며, 관계 규칙의 기본 말끝이나 few-shot 예시의 말끝과 다르면 현재 선택을 우선한다.',
    ...(request.route === 'guided_ai'
      ? [
          '[구조화 맥락 규칙]\ncurrent_input의 context_fact는 서버 카탈로그에서 검증한 사실이다. 이 사실만 반영하고, 생략된 날짜·시간·이유·상대 반응은 추측하거나 만들지 않는다.',
        ]
      : []),
    '[출력 규칙]\ntoneLevel 1은 기본, 2는 더 부드럽게, 3은 더 분명하게다. 각 단계를 정확히 한 번씩 포함하고 JSON Schema를 지킨다.',
  ].join('\n\n')

  return {
    system,
    messages: [
      {
        role: 'user',
        content:
          request.route === 'guided_ai'
            ? buildGuidedUserContent(request, exampleSets)
            : buildManualUserContent(request, exampleSets),
      },
    ],
    output_config: generatedReplyOutputConfig,
  }
}

export const buildPromptWithReviewedExamples = (request: AiGenerationRequest): BuiltPrompt =>
  buildPrompt(request, reviewedPromptExamplesFor(request.scenarioId))
