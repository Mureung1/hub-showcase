import {
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isRecord,
} from './contract-values.js'
import {
  hasExactPublicPreviewCommands,
  isExactPublicPreviewApplicationCommand,
} from './public-preview-values.js'

export type PublicPreviewParentSelection = {
  readonly selectionId: string
  readonly displayName: string
  readonly safeDisplayLocation: string
}

export type PublicPreviewYearLevelOption = {
  readonly value: number
  readonly label: string
}

export type PublicPreviewTermOption = {
  readonly value: string
  readonly label: string
}

export type PublicPreviewSemesterInput = {
  readonly yearLevel: number
  readonly term: string
  readonly parentSelectionId: string
  readonly leafName: string
}

export type PublicPreviewReadyCheck = {
  readonly account: 'confirmed'
  readonly workspace: 'confirmed'
  readonly ayEnvironment: 'confirmed'
}

export type PublicPreviewNextJourney = {
  readonly state: 'coming_next'
  readonly label: '첫 자료 가져오기'
}

export type PublicPreviewSetupProjection =
  | {
      readonly state: 'account_required'
      readonly reason: 'first_connection'
      readonly displayMessage: string
      readonly allowedCommands: readonly []
    }
  | {
      readonly state: 'account_required'
      readonly reason: 'workspace_reauth'
      readonly recoveryId: string
      readonly displayMessage: string
      readonly allowedCommands: readonly ['setup.resume']
    }
  | {
      readonly state: 'input_required'
      readonly yearLevelOptions: readonly PublicPreviewYearLevelOption[]
      readonly termOptions: readonly PublicPreviewTermOption[]
      readonly parentSelection: PublicPreviewParentSelection | null
      readonly suggestedLeafName: string
      readonly allowedCommands: readonly [
        'workspace.parent.select',
        'setup.prepare',
      ]
    }
  | {
      readonly state: 'confirmation_required'
      readonly setupPlanId: string
      readonly semesterLabel: string
      readonly parentSelection: PublicPreviewParentSelection
      readonly leafName: string
      readonly allowedCommands: readonly [
        'workspace.parent.select',
        'setup.approve',
      ]
    }
  | {
      readonly state: 'working'
      readonly stage: 'preparing_workspace' | 'verifying_environment'
      readonly displayMessage: string
      readonly allowedCommands: readonly []
    }
  | {
      readonly state: 'transition_blocked'
      readonly reason: 'setup_transition_unavailable'
      readonly retry: 'restart_required'
      readonly displayMessage: string
      readonly allowedCommands: readonly []
    }
  | {
      readonly state: 'transition_blocked'
      readonly reason:
        | 'setup_transition_unavailable'
        | 'account_unavailable'
      readonly retry: 'resume'
      readonly recoveryId: string
      readonly displayMessage: string
      readonly allowedCommands: readonly ['setup.resume']
    }
  | {
      readonly state: 'release_blocked'
      readonly displayMessage: string
      readonly requiredApplicationCommand: string
      readonly allowedCommands: readonly []
    }
  | {
      readonly state: 'recovery_required'
      readonly recoveryId: string
      readonly reason: 'owned_incomplete'
      readonly displayMessage: string
      readonly allowedCommands: readonly [
        'setup.recover.resume',
        'setup.recover.discard',
      ]
    }
  | {
      readonly state: 'recovery_required'
      readonly recoveryId: string
      readonly reason: 'bundle_missing'
      readonly displayMessage: string
      readonly allowedCommands: readonly ['setup.recover.resume']
    }
  | {
      readonly state: 'recovery_required'
      readonly recoveryId: string
      readonly reason: 'bundle_conflict' | 'context_conflict'
      readonly displayMessage: string
      readonly allowedCommands: readonly ['setup.recover.manual_guidance']
    }
  | {
      readonly state: 'ready'
      readonly semesterLabel: string
      readonly workspaceName: string
      readonly safeDisplayLocation: string
      readonly checks: PublicPreviewReadyCheck
      readonly nextJourney: PublicPreviewNextJourney
      readonly allowedCommands: readonly []
    }

export function decodePublicPreviewSetupProjection(
  value: unknown,
): PublicPreviewSetupProjection {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  switch (value.state) {
    case 'account_required':
      return decodeAccountRequired(value)
    case 'input_required':
      if (
        !isExactObject(value, [
          'allowedCommands',
          'parentSelection',
          'state',
          'suggestedLeafName',
          'termOptions',
          'yearLevelOptions',
        ]) ||
        !Array.isArray(value.yearLevelOptions) ||
        !Array.isArray(value.termOptions) ||
        !isNonEmptyString(value.suggestedLeafName) ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [
          'workspace.parent.select',
          'setup.prepare',
        ])
      ) {
        throw invalidContract()
      }
      return {
        state: 'input_required',
        yearLevelOptions: value.yearLevelOptions.map(decodeYearLevelOption),
        termOptions: value.termOptions.map(decodeTermOption),
        parentSelection:
          value.parentSelection === null
            ? null
            : decodeParentSelection(value.parentSelection),
        suggestedLeafName: value.suggestedLeafName,
        allowedCommands: ['workspace.parent.select', 'setup.prepare'],
      }
    case 'confirmation_required':
      if (
        !isExactObject(value, [
          'allowedCommands',
          'leafName',
          'parentSelection',
          'semesterLabel',
          'setupPlanId',
          'state',
        ]) ||
        !isNonEmptyString(value.leafName) ||
        !isNonEmptyString(value.semesterLabel) ||
        !isNonEmptyString(value.setupPlanId) ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [
          'workspace.parent.select',
          'setup.approve',
        ])
      ) {
        throw invalidContract()
      }
      return {
        state: 'confirmation_required',
        setupPlanId: value.setupPlanId,
        semesterLabel: value.semesterLabel,
        parentSelection: decodeParentSelection(value.parentSelection),
        leafName: value.leafName,
        allowedCommands: ['workspace.parent.select', 'setup.approve'],
      }
    case 'working':
      if (
        !isExactObject(value, [
          'allowedCommands',
          'displayMessage',
          'stage',
          'state',
        ]) ||
        (value.stage !== 'preparing_workspace' &&
          value.stage !== 'verifying_environment') ||
        !isNonEmptyString(value.displayMessage) ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [])
      ) {
        throw invalidContract()
      }
      return {
        state: 'working',
        stage: value.stage,
        displayMessage: value.displayMessage,
        allowedCommands: [],
      }
    case 'transition_blocked':
      return decodeTransitionBlocked(value)
    case 'release_blocked':
      if (
        !isExactObject(value, [
          'allowedCommands',
          'displayMessage',
          'requiredApplicationCommand',
          'state',
        ]) ||
        !isNonEmptyString(value.displayMessage) ||
        !isExactPublicPreviewApplicationCommand(
          value.requiredApplicationCommand,
        ) ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [])
      ) {
        throw invalidContract()
      }
      return {
        state: 'release_blocked',
        displayMessage: value.displayMessage,
        requiredApplicationCommand: value.requiredApplicationCommand,
        allowedCommands: [],
      }
    case 'recovery_required':
      return decodeRecoveryProjection(value)
    case 'ready':
      if (
        !isExactObject(value, [
          'allowedCommands',
          'checks',
          'nextJourney',
          'safeDisplayLocation',
          'semesterLabel',
          'state',
          'workspaceName',
        ]) ||
        !isNonEmptyString(value.safeDisplayLocation) ||
        !isNonEmptyString(value.semesterLabel) ||
        !isNonEmptyString(value.workspaceName) ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [])
      ) {
        throw invalidContract()
      }
      return {
        state: 'ready',
        semesterLabel: value.semesterLabel,
        workspaceName: value.workspaceName,
        safeDisplayLocation: value.safeDisplayLocation,
        checks: decodeReadyChecks(value.checks),
        nextJourney: decodeNextJourney(value.nextJourney),
        allowedCommands: [],
      }
    default:
      throw invalidContract()
  }
}

export function decodePublicPreviewSemesterInput(
  value: unknown,
): PublicPreviewSemesterInput {
  if (
    !isExactObject(value, [
      'leafName',
      'parentSelectionId',
      'term',
      'yearLevel',
    ]) ||
    !Number.isSafeInteger(value.yearLevel) ||
    Number(value.yearLevel) < 1 ||
    !isNonEmptyString(value.term) ||
    !isNonEmptyString(value.parentSelectionId) ||
    !isNonEmptyString(value.leafName)
  ) {
    throw invalidContract()
  }
  return {
    yearLevel: Number(value.yearLevel),
    term: value.term,
    parentSelectionId: value.parentSelectionId,
    leafName: value.leafName,
  }
}

function decodeRecoveryProjection(
  value: Record<string, unknown>,
): PublicPreviewSetupProjection {
  if (
    !isExactObject(value, [
      'allowedCommands',
      'displayMessage',
      'reason',
      'recoveryId',
      'state',
    ]) ||
    !isNonEmptyString(value.displayMessage) ||
    !isNonEmptyString(value.recoveryId) ||
    !isRecoveryReason(value.reason) ||
    !hasRecoveryCommands(value.reason, value.allowedCommands)
  ) {
    throw invalidContract()
  }
  if (value.reason === 'owned_incomplete') {
    return {
      state: 'recovery_required',
      recoveryId: value.recoveryId,
      reason: 'owned_incomplete',
      displayMessage: value.displayMessage,
      allowedCommands: ['setup.recover.resume', 'setup.recover.discard'],
    }
  }
  if (value.reason === 'bundle_missing') {
    return {
      state: 'recovery_required',
      recoveryId: value.recoveryId,
      reason: 'bundle_missing',
      displayMessage: value.displayMessage,
      allowedCommands: ['setup.recover.resume'],
    }
  }
  return {
    state: 'recovery_required',
    recoveryId: value.recoveryId,
    reason: value.reason,
    displayMessage: value.displayMessage,
    allowedCommands: ['setup.recover.manual_guidance'],
  }
}

function decodeAccountRequired(
  value: Record<string, unknown>,
): PublicPreviewSetupProjection {
  if (
    value.reason === 'first_connection' &&
    isExactObject(value, [
      'allowedCommands',
      'displayMessage',
      'reason',
      'state',
    ]) &&
    isNonEmptyString(value.displayMessage) &&
    hasExactPublicPreviewCommands(value.allowedCommands, [])
  ) {
    return {
      state: 'account_required',
      reason: 'first_connection',
      displayMessage: value.displayMessage,
      allowedCommands: [],
    }
  }
  if (
    value.reason === 'workspace_reauth' &&
    isExactObject(value, [
      'allowedCommands',
      'displayMessage',
      'reason',
      'recoveryId',
      'state',
    ]) &&
    isNonEmptyString(value.recoveryId) &&
    isNonEmptyString(value.displayMessage) &&
    hasExactPublicPreviewCommands(value.allowedCommands, ['setup.resume'])
  ) {
    return {
      state: 'account_required',
      reason: 'workspace_reauth',
      recoveryId: value.recoveryId,
      displayMessage: value.displayMessage,
      allowedCommands: ['setup.resume'],
    }
  }
  throw invalidContract()
}

function decodeTransitionBlocked(
  value: Record<string, unknown>,
): PublicPreviewSetupProjection {
  if (
    value.retry === 'restart_required' &&
    isExactObject(value, [
      'allowedCommands',
      'displayMessage',
      'reason',
      'retry',
      'state',
    ]) &&
    value.reason === 'setup_transition_unavailable' &&
    isNonEmptyString(value.displayMessage) &&
    hasExactPublicPreviewCommands(value.allowedCommands, [])
  ) {
    return {
      state: 'transition_blocked',
      reason: 'setup_transition_unavailable',
      retry: 'restart_required',
      displayMessage: value.displayMessage,
      allowedCommands: [],
    }
  }
  if (
    value.retry === 'resume' &&
    isExactObject(value, [
      'allowedCommands',
      'displayMessage',
      'reason',
      'recoveryId',
      'retry',
      'state',
    ]) &&
    (value.reason === 'setup_transition_unavailable' ||
      value.reason === 'account_unavailable') &&
    isNonEmptyString(value.recoveryId) &&
    isNonEmptyString(value.displayMessage) &&
    hasExactPublicPreviewCommands(value.allowedCommands, ['setup.resume'])
  ) {
    return {
      state: 'transition_blocked',
      reason: value.reason,
      retry: 'resume',
      recoveryId: value.recoveryId,
      displayMessage: value.displayMessage,
      allowedCommands: ['setup.resume'],
    }
  }
  throw invalidContract()
}

function decodeParentSelection(value: unknown): PublicPreviewParentSelection {
  if (
    !isExactObject(value, [
      'displayName',
      'safeDisplayLocation',
      'selectionId',
    ]) ||
    !isNonEmptyString(value.displayName) ||
    !isNonEmptyString(value.safeDisplayLocation) ||
    !isNonEmptyString(value.selectionId)
  ) {
    throw invalidContract()
  }
  return {
    selectionId: value.selectionId,
    displayName: value.displayName,
    safeDisplayLocation: value.safeDisplayLocation,
  }
}

function decodeYearLevelOption(value: unknown): PublicPreviewYearLevelOption {
  if (
    !isExactObject(value, ['label', 'value']) ||
    !Number.isSafeInteger(value.value) ||
    Number(value.value) < 1 ||
    !isNonEmptyString(value.label)
  ) {
    throw invalidContract()
  }
  return { value: Number(value.value), label: value.label }
}

function decodeTermOption(value: unknown): PublicPreviewTermOption {
  if (
    !isExactObject(value, ['label', 'value']) ||
    !isNonEmptyString(value.label) ||
    !isNonEmptyString(value.value)
  ) {
    throw invalidContract()
  }
  return { value: value.value, label: value.label }
}

function decodeReadyChecks(value: unknown): PublicPreviewReadyCheck {
  if (
    !isExactObject(value, ['account', 'ayEnvironment', 'workspace']) ||
    value.account !== 'confirmed' ||
    value.workspace !== 'confirmed' ||
    value.ayEnvironment !== 'confirmed'
  ) {
    throw invalidContract()
  }
  return {
    account: 'confirmed',
    workspace: 'confirmed',
    ayEnvironment: 'confirmed',
  }
}

function decodeNextJourney(value: unknown): PublicPreviewNextJourney {
  if (
    !isExactObject(value, ['label', 'state']) ||
    value.state !== 'coming_next' ||
    value.label !== '첫 자료 가져오기'
  ) {
    throw invalidContract()
  }
  return {
    state: 'coming_next',
    label: '첫 자료 가져오기',
  }
}

function isRecoveryReason(
  value: unknown,
): value is
  | 'owned_incomplete'
  | 'bundle_missing'
  | 'bundle_conflict'
  | 'context_conflict' {
  return (
    value === 'owned_incomplete' ||
    value === 'bundle_missing' ||
    value === 'bundle_conflict' ||
    value === 'context_conflict'
  )
}

function hasRecoveryCommands(
  reason:
    | 'owned_incomplete'
    | 'bundle_missing'
    | 'bundle_conflict'
    | 'context_conflict',
  value: unknown,
): boolean {
  if (reason === 'owned_incomplete') {
    return hasExactPublicPreviewCommands(value, [
      'setup.recover.resume',
      'setup.recover.discard',
    ])
  }
  if (reason === 'bundle_missing') {
    return hasExactPublicPreviewCommands(value, ['setup.recover.resume'])
  }
  return hasExactPublicPreviewCommands(value, [
    'setup.recover.manual_guidance',
  ])
}
