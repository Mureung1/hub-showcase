import {
  hasValidJsonEnvelope,
  invalidContract,
  isExactObject,
  isRecord,
} from './contract-values.js'
import {
  decodeProductCodexTurnSettings,
  type ProductCodexTurnSettings,
} from './codex-settings.js'

export type TargetProductChatRequest = {
  readonly text: string
  readonly codexSettings?: ProductCodexTurnSettings
}

export function decodeTargetProductChatRequest(
  value: unknown,
): TargetProductChatRequest {
  const fields = [
    'text',
    ...(isRecord(value) && value.codexSettings !== undefined
      ? ['codexSettings']
      : []),
  ]
  if (
    !isExactObject(value, fields) ||
    typeof value.text !== 'string' ||
    value.text.trim().length === 0 ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return {
    text: value.text,
    ...(value.codexSettings === undefined
      ? {}
      : { codexSettings: decodeProductCodexTurnSettings(value.codexSettings) }),
  }
}
