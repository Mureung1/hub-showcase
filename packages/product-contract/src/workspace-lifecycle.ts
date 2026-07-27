import {
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isProductWorkspaceId,
  isRecord,
  isTargetProductOperationId,
  utf8Bytes,
} from './contract-values.js'
import {
  decodeProductAccountReadiness,
  type ProductAccountReadiness,
} from './workspace.js'

const termKeyMaxBytes = 64
const termDisplayNameMaxBytes = 128
const workspaceLabelMaxBytes = 256

export type ProductSemesterIdentity = {
  readonly yearLevel: number
  readonly term: {
    readonly key: string
    readonly displayName: string
  }
}

export type ProductWorkspaceSummary = {
  readonly workspaceId: string
  readonly semester: ProductSemesterIdentity
  readonly label: string
}

export type ProductAvailableWorkspaceReference = ProductWorkspaceSummary & {
  readonly availability: 'available'
}

export type ProductUnavailableWorkspaceReference = {
  readonly availability: 'unavailable'
  readonly workspaceId: string
  readonly label: string
}

export type ProductWorkspaceLifecycle =
  | {
      readonly state: 'starting'
      readonly workspace: ProductWorkspaceSummary
    }
  | {
      readonly state: 'active'
      readonly workspace: ProductWorkspaceSummary
    }
  | {
      readonly state: 'recovery_required'
      readonly workspace: ProductUnavailableWorkspaceReference
      readonly reason: 'workspace_unavailable'
      readonly displayMessage: string
    }
  | {
      readonly state: 'recovery_required'
      readonly workspace: ProductAvailableWorkspaceReference
      readonly reason: 'runtime_unavailable'
      readonly displayMessage: string
    }
  | {
      readonly state: 'recovery_required'
      readonly workspace: null
      readonly reason:
        | 'prepared_workspace_required'
        | 'registry_incompatible'
      readonly displayMessage: string
    }

export type TargetProductBootstrap = {
  readonly accountReadiness: ProductAccountReadiness
  readonly workspaceLifecycle: ProductWorkspaceLifecycle
  readonly activeOperation: {
    readonly operationId: string
    readonly kind: 'product_turn'
  } | null
}

export function decodeTargetProductBootstrap(
  value: unknown,
): TargetProductBootstrap {
  if (
    !isExactObject(value, [
      'accountReadiness',
      'activeOperation',
      'workspaceLifecycle',
    ])
  ) {
    throw invalidContract()
  }
  const workspaceLifecycle = decodeProductWorkspaceLifecycle(
    value.workspaceLifecycle,
  )
  const activeOperation = decodeActiveOperation(value.activeOperation)
  if (activeOperation !== null && workspaceLifecycle.state !== 'active') {
    throw invalidContract()
  }
  return {
    accountReadiness: decodeProductAccountReadiness(value.accountReadiness),
    workspaceLifecycle,
    activeOperation,
  }
}

export function decodeProductWorkspaceLifecycle(
  value: unknown,
): ProductWorkspaceLifecycle {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  if (value.state === 'starting' || value.state === 'active') {
    if (!isExactObject(value, ['state', 'workspace'])) {
      throw invalidContract()
    }
    return {
      state: value.state,
      workspace: decodeWorkspaceSummary(value.workspace),
    }
  }
  if (value.state === 'recovery_required') {
    return decodeRecoveryLifecycle(value)
  }
  throw invalidContract()
}

function decodeRecoveryLifecycle(
  value: Record<string, unknown>,
): Extract<ProductWorkspaceLifecycle, { state: 'recovery_required' }> {
  if (
    !isExactObject(value, [
      'displayMessage',
      'reason',
      'state',
      'workspace',
    ]) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  if (value.reason === 'workspace_unavailable') {
    return {
      state: 'recovery_required',
      workspace: decodeUnavailableWorkspaceReference(value.workspace),
      reason: 'workspace_unavailable',
      displayMessage: value.displayMessage,
    }
  }
  if (value.reason === 'runtime_unavailable') {
    return {
      state: 'recovery_required',
      workspace: decodeAvailableWorkspaceReference(value.workspace),
      reason: 'runtime_unavailable',
      displayMessage: value.displayMessage,
    }
  }
  if (
    (value.reason === 'prepared_workspace_required' ||
      value.reason === 'registry_incompatible') &&
    value.workspace === null
  ) {
    return {
      state: 'recovery_required',
      workspace: null,
      reason: value.reason,
      displayMessage: value.displayMessage,
    }
  }
  throw invalidContract()
}

function decodeWorkspaceSummary(value: unknown): ProductWorkspaceSummary {
  if (!isExactObject(value, ['label', 'semester', 'workspaceId'])) {
    throw invalidContract()
  }
  return decodeWorkspaceSummaryFields(value)
}

function decodeAvailableWorkspaceReference(
  value: unknown,
): ProductAvailableWorkspaceReference {
  if (
    !isExactObject(value, [
      'availability',
      'label',
      'semester',
      'workspaceId',
    ]) ||
    value.availability !== 'available'
  ) {
    throw invalidContract()
  }
  return {
    availability: 'available',
    ...decodeWorkspaceSummaryFields(value),
  }
}

function decodeWorkspaceSummaryFields(
  value: Record<string, unknown>,
): ProductWorkspaceSummary {
  if (
    !isProductWorkspaceId(value.workspaceId) ||
    !isSafeWorkspaceLabel(value.label)
  ) {
    throw invalidContract()
  }
  return {
    workspaceId: value.workspaceId,
    semester: decodeSemesterIdentity(value.semester),
    label: value.label,
  }
}

function decodeUnavailableWorkspaceReference(
  value: unknown,
): ProductUnavailableWorkspaceReference {
  if (
    !isExactObject(value, ['availability', 'label', 'workspaceId']) ||
    value.availability !== 'unavailable' ||
    !isProductWorkspaceId(value.workspaceId) ||
    !isSafeWorkspaceLabel(value.label)
  ) {
    throw invalidContract()
  }
  return {
    availability: 'unavailable',
    workspaceId: value.workspaceId,
    label: value.label,
  }
}

function decodeSemesterIdentity(value: unknown): ProductSemesterIdentity {
  if (
    !isExactObject(value, ['term', 'yearLevel']) ||
    !Number.isSafeInteger(value.yearLevel) ||
    Number(value.yearLevel) < 1 ||
    Number(value.yearLevel) > 20 ||
    !isExactObject(value.term, ['displayName', 'key']) ||
    typeof value.term.key !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.term.key) ||
    utf8Bytes(value.term.key) > termKeyMaxBytes ||
    typeof value.term.displayName !== 'string' ||
    value.term.displayName.trim().length === 0 ||
    utf8Bytes(value.term.displayName) > termDisplayNameMaxBytes
  ) {
    throw invalidContract()
  }
  return {
    yearLevel: Number(value.yearLevel),
    term: {
      key: value.term.key,
      displayName: value.term.displayName,
    },
  }
}

function decodeActiveOperation(
  value: unknown,
): TargetProductBootstrap['activeOperation'] {
  if (value === null) return null
  if (
    !isExactObject(value, ['kind', 'operationId']) ||
    !isTargetProductOperationId(value.operationId) ||
    value.kind !== 'product_turn'
  ) {
    throw invalidContract()
  }
  return { operationId: value.operationId, kind: 'product_turn' }
}

function isSafeWorkspaceLabel(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    utf8Bytes(value) <= workspaceLabelMaxBytes &&
    !/[\p{Cc}/\\]/u.test(value)
  )
}
