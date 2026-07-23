import type { PublicPreviewAccountProjection } from '../account.js'
import type {
  PublicPreviewCommand,
  PublicPreviewResponse,
} from '../public-preview.js'
import type { PublicPreviewSetupProjection } from '../setup.js'

const parentSelection = {
  selectionId: 'parent_selection_primary',
  displayName: 'Documents',
  safeDisplayLocation: 'Home › Documents',
} as const

export const PUBLIC_PREVIEW_ACCOUNT_FIXTURES = {
  checking: { state: 'checking', allowedCommands: [] },
  loginRequired: {
    state: 'login_required',
    displayMessage: 'ChatGPT 연결이 필요합니다.',
    allowedCommands: ['account.login.start', 'account.retry'],
  },
  loginStarting: {
    state: 'login_starting',
    displayMessage: '안전한 로그인 창을 준비하고 있습니다.',
    allowedCommands: [],
  },
  loginPending: {
    state: 'login_pending',
    attemptId: 'account_attempt_primary',
    authUrl: 'https://auth.openai.com/codex',
    expiresAt: '2026-07-23T12:00:00.000Z',
    allowedCommands: ['account.login.cancel'],
  },
  verifying: {
    state: 'verifying',
    displayMessage: '연결 결과를 확인하고 있습니다.',
    allowedCommands: [],
  },
  connected: {
    state: 'connected',
    providerLabel: 'ChatGPT',
    allowedCommands: ['account.logout'],
  },
  unsupportedAccount: {
    state: 'unsupported_account',
    displayMessage: '이 계정 유형은 현재 preview에서 지원하지 않습니다.',
    allowedCommands: ['account.logout'],
  },
  unavailable: {
    state: 'unavailable',
    displayMessage: '지금은 계정 상태를 확인할 수 없습니다.',
    allowedCommands: ['account.retry'],
  },
} as const satisfies Readonly<Record<string, PublicPreviewAccountProjection>>

export const PUBLIC_PREVIEW_SETUP_FIXTURES = {
  firstConnection: {
    state: 'account_required',
    reason: 'first_connection',
    displayMessage: '학기 공간을 만들기 전에 ChatGPT를 연결해 주세요.',
    allowedCommands: [],
  },
  workspaceReauth: {
    state: 'account_required',
    reason: 'workspace_reauth',
    recoveryId: 'setup_workspace_reauth',
    displayMessage: '학기 공간을 다시 열려면 ChatGPT 연결을 확인해 주세요.',
    allowedCommands: ['setup.resume'],
  },
  inputRequired: {
    state: 'input_required',
    yearLevelOptions: [
      { value: 1, label: '1학년' },
      { value: 2, label: '2학년' },
      { value: 3, label: '3학년' },
      { value: 4, label: '4학년' },
    ],
    termOptions: [
      { value: '1', label: '1학기' },
      { value: '2', label: '2학기' },
    ],
    parentSelection,
    suggestedLeafName: '2026-2학기',
    allowedCommands: ['workspace.parent.select', 'setup.prepare'],
  },
  confirmationRequired: {
    state: 'confirmation_required',
    setupPlanId: 'setup_plan_primary',
    semesterLabel: '2학년 2학기',
    parentSelection,
    leafName: '2026-2학기',
    allowedCommands: ['workspace.parent.select', 'setup.approve'],
  },
  working: {
    state: 'working',
    stage: 'preparing_workspace',
    displayMessage: '학기 공간과 AY 환경을 준비하고 있습니다.',
    allowedCommands: [],
  },
  transitionResume: {
    state: 'transition_blocked',
    reason: 'setup_transition_unavailable',
    retry: 'resume',
    recoveryId: 'setup_transition_primary',
    displayMessage: '준비한 학기 공간으로 연결을 다시 시도해 주세요.',
    allowedCommands: ['setup.resume'],
  },
  transitionRestart: {
    state: 'transition_blocked',
    reason: 'setup_transition_unavailable',
    retry: 'restart_required',
    displayMessage: 'AY-PLE을 종료한 뒤 같은 명령으로 다시 실행해 주세요.',
    allowedCommands: [],
  },
  releaseBlocked: {
    state: 'release_blocked',
    displayMessage: '이 학기 공간을 만든 AY-PLE 버전으로 다시 실행해 주세요.',
    requiredApplicationCommand: 'npx ay-ple@0.1.0-preview.1',
    allowedCommands: [],
  },
  ownedIncompleteRecovery: {
    state: 'recovery_required',
    recoveryId: 'setup_recovery_primary',
    reason: 'owned_incomplete',
    displayMessage: '중단된 학기 공간 준비 작업을 확인해 주세요.',
    allowedCommands: ['setup.recover.resume', 'setup.recover.discard'],
  },
  bundleMissingRecovery: {
    state: 'recovery_required',
    recoveryId: 'setup_recovery_bundle_missing',
    reason: 'bundle_missing',
    displayMessage: '누락된 AY 환경 파일을 안전하게 복구할 수 있습니다.',
    allowedCommands: ['setup.recover.resume'],
  },
  bundleConflictRecovery: {
    state: 'recovery_required',
    recoveryId: 'setup_recovery_bundle_conflict',
    reason: 'bundle_conflict',
    displayMessage: '변경된 AY 환경 파일을 직접 확인해 주세요.',
    allowedCommands: ['setup.recover.manual_guidance'],
  },
  contextConflictRecovery: {
    state: 'recovery_required',
    recoveryId: 'setup_recovery_context_conflict',
    reason: 'context_conflict',
    displayMessage: '충돌하는 workspace 설정을 직접 확인해 주세요.',
    allowedCommands: ['setup.recover.manual_guidance'],
  },
  ready: {
    state: 'ready',
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: 'Home › Documents › 2026-2학기',
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
  },
} as const satisfies Readonly<Record<string, PublicPreviewSetupProjection>>

export const PUBLIC_PREVIEW_COMMAND_FIXTURES = [
  { command: 'account.login.start' },
  {
    command: 'account.login.cancel',
    attemptId: 'account_attempt_primary',
  },
  { command: 'account.logout' },
  { command: 'account.retry' },
  { command: 'workspace.parent.select' },
  {
    command: 'setup.prepare',
    input: {
      yearLevel: 2,
      term: '2',
      parentSelectionId: 'parent_selection_primary',
      leafName: '2026-2학기',
    },
  },
  { command: 'setup.approve', setupPlanId: 'setup_plan_primary' },
  {
    command: 'setup.resume',
    recoveryId: 'setup_transition_primary',
  },
  {
    command: 'setup.recover.resume',
    recoveryId: 'setup_recovery_primary',
  },
  {
    command: 'setup.recover.discard',
    recoveryId: 'setup_recovery_primary',
  },
  {
    command: 'setup.recover.manual_guidance',
    recoveryId: 'setup_recovery_bundle_conflict',
  },
] as const satisfies readonly PublicPreviewCommand[]

const cancelledAccount = {
  state: 'login_required',
  displayMessage: '로그인이 취소되었습니다. 준비되면 다시 연결해 주세요.',
  allowedCommands: ['account.login.start', 'account.retry'],
} as const satisfies PublicPreviewAccountProjection

export const PUBLIC_PREVIEW_SCENARIO_FIXTURES = [
  {
    name: 'signed_out',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
      },
    },
  },
  {
    name: 'login_offered',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginStarting,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
      },
    },
  },
  {
    name: 'login_pending',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
      },
    },
  },
  {
    name: 'auth_cancelled',
    response: {
      status: 'ok',
      projection: {
        account: cancelledAccount,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
      },
    },
  },
  {
    name: 'authenticated',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.inputRequired,
      },
    },
  },
  {
    name: 'confirmation_required',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.confirmationRequired,
      },
    },
  },
  {
    name: 'working',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.working,
      },
    },
  },
  {
    name: 'operation_blocked_during_transition',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.transitionResume,
      },
    },
  },
  {
    name: 'recovery_required',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.ownedIncompleteRecovery,
      },
    },
  },
  {
    name: 'ready',
    response: {
      status: 'ok',
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.ready,
      },
    },
  },
  {
    name: 'setup_conflict',
    response: {
      status: 'error',
      error: {
        code: 'setup_conflict',
        displayMessage:
          '다른 탭에서 변경된 현재 상태를 다시 확인해 주세요.',
        retryable: true,
      },
      projection: {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.confirmationRequired,
      },
    },
  },
] as const satisfies readonly {
  readonly name: string
  readonly response: PublicPreviewResponse
}[]

export const PUBLIC_PREVIEW_RESPONSE_FIXTURES =
  PUBLIC_PREVIEW_SCENARIO_FIXTURES.map(({ response }) => response)
