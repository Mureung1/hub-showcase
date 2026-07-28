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
import { isProductWorkspaceRelativePath } from './workspace-sources.js'

export const PRODUCT_ACTION_FILE_REF_MAX_ENTRIES = 16

export type TargetProductChatRequest = {
  readonly text: string
  readonly codexSettings?: ProductCodexTurnSettings
}

export type ProductWorkspaceFileRef = {
  readonly relativePath: string
}

export type TargetProductActionInvocationRequest = {
  readonly action: 'model_semester'
  readonly files: readonly ProductWorkspaceFileRef[]
  readonly codexSettings?: ProductCodexTurnSettings
}

export function decodeTargetProductActionInvocationRequest(
  value: unknown,
): TargetProductActionInvocationRequest {
  const fields = [
    'action',
    'files',
    ...(isRecord(value) && value.codexSettings !== undefined
      ? ['codexSettings']
      : []),
  ]
  if (
    !isExactObject(value, fields) ||
    value.action !== 'model_semester' ||
    !Array.isArray(value.files) ||
    value.files.length < 1 ||
    value.files.length > PRODUCT_ACTION_FILE_REF_MAX_ENTRIES ||
    !value.files.every(
      (file) =>
        isExactObject(file, ['relativePath']) &&
        isProductWorkspaceRelativePath(file.relativePath),
    ) ||
    new Set(
      value.files.map((file) =>
        isRecord(file) ? file.relativePath : undefined,
      ),
    ).size !== value.files.length ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return {
    action: value.action,
    files: value.files.map((file) => ({
      relativePath: file.relativePath as string,
    })),
    ...(value.codexSettings === undefined
      ? {}
      : { codexSettings: decodeProductCodexTurnSettings(value.codexSettings) }),
  }
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
