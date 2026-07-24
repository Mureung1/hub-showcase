import {
  hasValidJsonEnvelope,
  invalidContract,
  isExactObject,
  isNonEmptyString,
} from './contract-values.js'

export type ProductCodexReasoningEffort = {
  readonly reasoningEffort: string
  readonly description: string
}

export type ProductCodexModel = {
  readonly model: string
  readonly displayName: string
  readonly description: string
  readonly isDefault: boolean
  readonly defaultReasoningEffort: string
  readonly supportedReasoningEfforts: readonly ProductCodexReasoningEffort[]
  readonly fastModeAvailable: boolean
  readonly fastModeDefault: boolean
}

export type ProductCodexSettings = {
  readonly models: readonly ProductCodexModel[]
}

export type ProductCodexTurnSettings = {
  readonly model: string
  readonly reasoningEffort: string
  readonly serviceTier: 'default' | 'fast'
}

export function decodeProductCodexSettings(
  value: unknown,
): ProductCodexSettings {
  if (
    !isExactObject(value, ['models']) ||
    !Array.isArray(value.models) ||
    value.models.length === 0 ||
    value.models.length > 128 ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return { models: value.models.map(decodeProductCodexModel) }
}

export function decodeProductCodexTurnSettings(
  value: unknown,
): ProductCodexTurnSettings {
  if (
    !isExactObject(value, [
      'model',
      'reasoningEffort',
      'serviceTier',
    ]) ||
    !isNonEmptyString(value.model) ||
    value.model.length > 256 ||
    !isNonEmptyString(value.reasoningEffort) ||
    value.reasoningEffort.length > 64 ||
    (value.serviceTier !== 'default' && value.serviceTier !== 'fast')
  ) {
    throw invalidContract()
  }
  return {
    model: value.model,
    reasoningEffort: value.reasoningEffort,
    serviceTier: value.serviceTier,
  }
}

function decodeProductCodexModel(value: unknown): ProductCodexModel {
  if (
    !isExactObject(value, [
      'defaultReasoningEffort',
      'description',
      'displayName',
      'fastModeAvailable',
      'fastModeDefault',
      'isDefault',
      'model',
      'supportedReasoningEfforts',
    ]) ||
    !isNonEmptyString(value.model) ||
    !isNonEmptyString(value.displayName) ||
    typeof value.description !== 'string' ||
    typeof value.isDefault !== 'boolean' ||
    !isNonEmptyString(value.defaultReasoningEffort) ||
    typeof value.fastModeAvailable !== 'boolean' ||
    typeof value.fastModeDefault !== 'boolean' ||
    (value.fastModeDefault && !value.fastModeAvailable) ||
    !Array.isArray(value.supportedReasoningEfforts) ||
    value.supportedReasoningEfforts.length === 0 ||
    value.supportedReasoningEfforts.length > 16
  ) {
    throw invalidContract()
  }
  const supportedReasoningEfforts = value.supportedReasoningEfforts.map(
    decodeProductCodexReasoningEffort,
  )
  if (
    !supportedReasoningEfforts.some(
      ({ reasoningEffort }) =>
        reasoningEffort === value.defaultReasoningEffort,
    )
  ) {
    throw invalidContract()
  }
  return {
    model: value.model,
    displayName: value.displayName,
    description: value.description,
    isDefault: value.isDefault,
    defaultReasoningEffort: value.defaultReasoningEffort,
    supportedReasoningEfforts,
    fastModeAvailable: value.fastModeAvailable,
    fastModeDefault: value.fastModeDefault,
  }
}

function decodeProductCodexReasoningEffort(
  value: unknown,
): ProductCodexReasoningEffort {
  if (
    !isExactObject(value, ['description', 'reasoningEffort']) ||
    !isNonEmptyString(value.reasoningEffort) ||
    typeof value.description !== 'string'
  ) {
    throw invalidContract()
  }
  return {
    reasoningEffort: value.reasoningEffort,
    description: value.description,
  }
}
