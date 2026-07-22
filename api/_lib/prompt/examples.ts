import type { Mode, PurposeId, ScenarioId } from '../../../src/entities/message/index.js'
import {
  parseGeneratedReply,
  receivedMessageMaxLength,
  situationMaxLength,
  type GeneratedCandidate,
} from '../../../src/shared/generation/contracts.js'

export type PromptExampleSet = {
  readonly scenarioId: ScenarioId
  readonly purpose: PurposeId
  readonly situation: string
  readonly receivedMessage?: string
  readonly candidates: readonly GeneratedCandidate[]
}

export type ReviewedPromptExampleSet = PromptExampleSet & {
  readonly catalogVersion: string
  readonly exampleId: string
  readonly mode: Mode
}

export type PromptExamplePair = readonly [PromptExampleSet, PromptExampleSet]

const isValidRequiredText = (value: string, maxLength: number) => {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= maxLength
}

const normalizeExampleSet = (
  scenarioId: ScenarioId,
  exampleSet: PromptExampleSet,
): PromptExampleSet | null => {
  if (exampleSet.scenarioId !== scenarioId) return null
  if (!isValidRequiredText(exampleSet.situation, situationMaxLength)) return null
  if (
    exampleSet.receivedMessage !== undefined &&
    !isValidRequiredText(exampleSet.receivedMessage, receivedMessageMaxLength)
  ) {
    return null
  }

  const generatedReply = parseGeneratedReply({ candidates: exampleSet.candidates })
  if (!generatedReply) return null

  return {
    scenarioId: exampleSet.scenarioId,
    purpose: exampleSet.purpose,
    situation: exampleSet.situation.trim(),
    ...(exampleSet.receivedMessage
      ? { receivedMessage: exampleSet.receivedMessage.trim() }
      : {}),
    candidates: generatedReply.candidates,
  }
}

export const requirePromptExamplePair = (
  scenarioId: ScenarioId,
  exampleSets: readonly PromptExampleSet[],
): PromptExamplePair => {
  if (exampleSets.length !== 2) {
    throw new Error('Prompt requires exactly two reviewed example sets')
  }

  const first = normalizeExampleSet(scenarioId, exampleSets[0])
  const second = normalizeExampleSet(scenarioId, exampleSets[1])
  if (!first || !second) {
    throw new Error('Prompt examples must match the scenario and generation contract')
  }

  return [first, second]
}
