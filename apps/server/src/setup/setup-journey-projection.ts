import {
  decodePublicPreviewSetupProjection,
  type PublicPreviewParentSelection,
  type PublicPreviewSetupProjection,
} from '@ay-ple/product-contract'
import type {
  AdmittedSemesterWorkspace,
  SemesterSetupJourneyProjection,
} from '@ay-ple/semester-workspace'

export type SetupJourneyProjectionContext = {
  readonly parentSelection: PublicPreviewParentSelection | null
  readonly suggestedLeafName: string
  readonly requiredApplicationCommand: string
  readonly accountConnected: boolean
  readonly presentReadyWorkspace: (
    workspace: AdmittedSemesterWorkspace,
  ) => {
    readonly semesterLabel: string
    readonly workspaceName: string
    readonly safeDisplayLocation: string
  }
}

const yearLevelOptions = [
  { value: 1, label: '1학년' },
  { value: 2, label: '2학년' },
  { value: 3, label: '3학년' },
  { value: 4, label: '4학년' },
] as const

const termOptions = [
  { value: '1', label: '1학기' },
  { value: '2', label: '2학기' },
] as const

export function toPublicPreviewSetupProjection(
  projection: SemesterSetupJourneyProjection,
  context: SetupJourneyProjectionContext,
): PublicPreviewSetupProjection {
  switch (projection.state) {
    case 'input_required':
      return decode({
        state: 'input_required',
        yearLevelOptions,
        termOptions,
        parentSelection: context.parentSelection,
        suggestedLeafName: context.suggestedLeafName,
        allowedCommands: [
          'workspace.parent.select',
          'setup.prepare',
        ],
      })
    case 'confirmation_required':
      return decode({
        state: 'confirmation_required',
        setupPlanId: projection.setupPlanId,
        semesterLabel: projection.semesterLabel,
        parentSelection: projection.parentSelection,
        leafName: projection.leafName,
        allowedCommands: [
          'workspace.parent.select',
          'setup.approve',
        ],
      })
    case 'working':
      return decode({
        state: 'working',
        stage: projection.stage,
        displayMessage:
          projection.stage === 'preparing_workspace'
            ? '학기 공간과 AY 환경을 준비하고 있습니다.'
            : '학기 공간의 AY 환경을 확인하고 있습니다.',
        allowedCommands: [],
      })
    case 'recovery_required':
      return recoveryProjection(projection)
    case 'blocked':
      if (projection.reason === 'setup_release_mismatch') {
        return decode({
          state: 'release_blocked',
          displayMessage:
            '이 학기 공간을 만든 AY-PLE 버전으로 다시 실행해 주세요.',
          requiredApplicationCommand:
            context.requiredApplicationCommand,
          allowedCommands: [],
        })
      }
      return decode({
        state: 'transition_blocked',
        reason: 'setup_transition_unavailable',
        retry: 'restart_required',
        displayMessage:
          'AY-PLE을 종료한 뒤 같은 명령으로 다시 실행해 주세요.',
        allowedCommands: [],
      })
    case 'workspace_reauth':
      return context.accountConnected
        ? decode({
            state: 'account_required',
            reason: 'workspace_reauth',
            resume: 'available',
            recoveryId: projection.recoveryId,
            displayMessage:
              'Codex 연결을 확인했습니다. 보존된 학기 공간 준비를 이어가세요.',
            allowedCommands: ['setup.resume'],
          })
        : decode({
            state: 'account_required',
            reason: 'workspace_reauth',
            resume: 'awaiting_account',
            recoveryId: projection.recoveryId,
            displayMessage:
              '학기 공간은 그대로 보존되어 있습니다. Codex에 다시 연결해 주세요.',
            allowedCommands: [],
          })
    case 'transition_blocked':
      if (projection.retry === 'restart_required') {
        return decode({
          state: 'transition_blocked',
          reason: 'setup_transition_unavailable',
          retry: 'restart_required',
          displayMessage:
            'AY-PLE을 종료한 뒤 같은 명령으로 다시 실행해 주세요.',
          allowedCommands: [],
        })
      }
      if (!projection.recoveryId) {
        throw new TypeError('Resumable setup transition requires an id')
      }
      return decode({
        state: 'transition_blocked',
        reason: projection.reason,
        retry: 'resume',
        recoveryId: projection.recoveryId,
        displayMessage:
          projection.reason === 'account_unavailable'
            ? 'Codex 연결 상태를 확인한 뒤 학기 공간 준비를 다시 시도해 주세요.'
            : '학기 공간 준비를 다시 시도해 주세요.',
        allowedCommands: ['setup.resume'],
      })
    case 'ready':
      return readyProjection(projection.workspace, context)
  }
}

function readyProjection(
  workspace: AdmittedSemesterWorkspace,
  context: SetupJourneyProjectionContext,
): PublicPreviewSetupProjection {
  const presentation = context.presentReadyWorkspace(workspace)
  if (
    !presentation.semesterLabel.trim() ||
    !presentation.workspaceName.trim() ||
    !presentation.safeDisplayLocation.trim() ||
    hasControl(presentation.semesterLabel) ||
    hasControl(presentation.workspaceName) ||
    hasControl(presentation.safeDisplayLocation) ||
    presentation.semesterLabel.includes('/') ||
    presentation.semesterLabel.includes('\\') ||
    presentation.workspaceName.includes('/') ||
    presentation.workspaceName.includes('\\') ||
    presentation.safeDisplayLocation.includes('/') ||
    presentation.safeDisplayLocation.includes('\\') ||
    presentation.semesterLabel.includes(workspace.canonicalRoot) ||
    presentation.workspaceName.includes(workspace.canonicalRoot) ||
    presentation.safeDisplayLocation.includes(workspace.canonicalRoot) ||
    presentation.semesterLabel.includes(workspace.workspaceId) ||
    presentation.workspaceName.includes(workspace.workspaceId) ||
    presentation.safeDisplayLocation.includes(workspace.workspaceId)
  ) {
    throw new TypeError('Ready requires a safe workspace presentation')
  }
  return decode({
    state: 'ready',
    semesterLabel: presentation.semesterLabel,
    workspaceName: presentation.workspaceName,
    safeDisplayLocation: presentation.safeDisplayLocation,
    checks: {
      account: 'confirmed',
      workspace: 'confirmed',
      ayEnvironment: 'confirmed',
    },
    nextJourney: {
      state: 'coming_next',
      label: '첫 자료 가져오기',
    },
    allowedCommands: [],
  })
}

function hasControl(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value)
}

function recoveryProjection(
  projection: Extract<
    SemesterSetupJourneyProjection,
    { state: 'recovery_required' }
  >,
): PublicPreviewSetupProjection {
  if (projection.reason === 'owned_incomplete') {
    return decode({
      state: 'recovery_required',
      recoveryId: projection.recoveryId,
      reason: 'owned_incomplete',
      displayMessage:
        '중단된 학기 공간 준비 작업을 확인해 주세요.',
      allowedCommands: [
        'setup.recover.resume',
        'setup.recover.discard',
      ],
    })
  }
  if (projection.reason === 'bundle_missing') {
    return decode({
      state: 'recovery_required',
      recoveryId: projection.recoveryId,
      reason: 'bundle_missing',
      displayMessage:
        '누락된 AY 환경 파일을 안전하게 복구할 수 있습니다.',
      allowedCommands: ['setup.recover.resume'],
    })
  }
  return decode({
    state: 'recovery_required',
    recoveryId: projection.recoveryId,
    reason: projection.reason,
    displayMessage:
      projection.reason === 'bundle_conflict'
        ? '변경된 AY 환경 파일을 직접 확인해 주세요.'
        : '충돌하는 workspace 설정을 직접 확인해 주세요.',
    allowedCommands: ['setup.recover.manual_guidance'],
  })
}

function decode(value: unknown): PublicPreviewSetupProjection {
  return decodePublicPreviewSetupProjection(value)
}
