import type {
  PublicPreviewAccountProjection,
  PublicPreviewBootstrap,
  PublicPreviewCommand,
  PublicPreviewSetupProjection,
  PublicPreviewTermOption,
  PublicPreviewYearLevelOption,
} from '@ay-ple/product-contract'

export type PublicPreviewAction = {
  readonly id:
    | 'account_retry'
    | 'approve'
    | 'login_cancel'
    | 'login_start'
    | 'logout'
    | 'manual_guidance'
    | 'parent_select'
    | 'prepare'
    | 'recover_discard'
    | 'recover_resume'
    | 'resume'
  readonly label: string
  readonly hierarchy: 'danger' | 'primary' | 'secondary' | 'quiet'
}

type PublicPreviewScreenBase = {
  readonly title: string
  readonly message: string
  readonly busy: boolean
  readonly actions: readonly PublicPreviewAction[]
  readonly accountAction?: PublicPreviewAction
  readonly externalLoginUrl?: string
}

type PublicPreviewAccountScreen = PublicPreviewScreenBase & {
  readonly surface: 'account'
}

type PublicPreviewGuidedInputScreen = PublicPreviewScreenBase & {
  readonly surface: 'guided'
  readonly stage: 'input'
  readonly form: {
    readonly yearLevelOptions: readonly PublicPreviewYearLevelOption[]
    readonly termOptions: readonly PublicPreviewTermOption[]
    readonly parentName: string | null
    readonly safeDisplayLocation: string | null
    readonly suggestedLeafName: string
  }
}

type PublicPreviewGuidedConfirmationScreen = PublicPreviewScreenBase & {
  readonly surface: 'guided'
  readonly stage: 'confirmation'
  readonly summary: {
    readonly semesterLabel: string
    readonly parentName: string
    readonly workspaceName: string
    readonly safeDisplayLocation: string
  }
}

type PublicPreviewGuidedWorkingScreen = PublicPreviewScreenBase & {
  readonly surface: 'guided'
  readonly stage: 'working'
  readonly progress: readonly {
    readonly label: string
    readonly state: 'active' | 'complete' | 'upcoming'
  }[]
}

type PublicPreviewProtectedScreen = PublicPreviewScreenBase & {
  readonly surface: 'protected'
  readonly protection:
    | 'account'
    | 'manual_recovery'
    | 'release'
    | 'restart'
    | 'safe_recovery'
    | 'transition'
  readonly requiredApplicationCommand?: string
}

type PublicPreviewReadyScreen = PublicPreviewScreenBase & {
  readonly surface: 'ready'
  readonly checks: readonly [
    'Codex 연결 확인됨',
    '학기 공간 확인됨',
    'AY 작업 환경 확인됨',
  ]
  readonly workspace: {
    readonly semesterLabel: string
    readonly workspaceName: string
    readonly safeDisplayLocation: string
  }
  readonly boundaryCopy: string
  readonly nextJourney: {
    readonly eyebrow: '다음 제품 여정 · COMING NEXT'
    readonly label: '첫 자료 가져오기'
    readonly disabled: true
  }
}

export type PublicPreviewScreenModel =
  | PublicPreviewAccountScreen
  | PublicPreviewGuidedConfirmationScreen
  | PublicPreviewGuidedInputScreen
  | PublicPreviewGuidedWorkingScreen
  | PublicPreviewProtectedScreen
  | PublicPreviewReadyScreen

export type PublicPreviewSemesterDraft = {
  readonly yearLevel: number
  readonly term: string
  readonly leafName: string
}

export type ReleaseCommandCopyOutcome = 'failure' | 'idle' | 'success'

export type ReleaseCommandCopyFeedback = {
  readonly ariaLive: 'polite'
  readonly message: string
  readonly role: 'status'
  readonly tone: 'failure' | 'success'
}

export class PublicPreviewActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicPreviewActionError'
  }
}

export function reconcilePublicPreviewSemesterDraft(
  current: PublicPreviewSemesterDraft | null,
  setup: Extract<
    PublicPreviewSetupProjection,
    { readonly state: 'input_required' }
  >,
): PublicPreviewSemesterDraft {
  const defaultYearLevel = setup.yearLevelOptions[0]?.value ?? 1
  const defaultTerm = setup.termOptions[0]?.value ?? ''
  if (current === null) {
    return {
      yearLevel: defaultYearLevel,
      term: defaultTerm,
      leafName: setup.suggestedLeafName,
    }
  }
  return {
    yearLevel: setup.yearLevelOptions.some(
      ({ value }) => value === current.yearLevel,
    )
      ? current.yearLevel
      : defaultYearLevel,
    term: setup.termOptions.some(({ value }) => value === current.term)
      ? current.term
      : defaultTerm,
    leafName: current.leafName,
  }
}

export function projectPublicPreviewFocusKey(
  bootstrap: PublicPreviewBootstrap,
): string {
  const screen = projectPublicPreviewScreen(bootstrap)
  if (screen.surface === 'account') {
    return `account:${bootstrap.account.state}`
  }
  if (screen.surface === 'guided') return `guided:${screen.stage}`
  if (screen.surface === 'ready') return 'ready'
  if (screen.protection === 'account') {
    return `protected:account:${bootstrap.account.state}`
  }
  if (bootstrap.setup.state === 'recovery_required') {
    return `protected:recovery:${bootstrap.setup.reason}`
  }
  if (bootstrap.setup.state === 'transition_blocked') {
    return `protected:transition:${bootstrap.setup.retry}`
  }
  if (bootstrap.setup.state === 'release_blocked') {
    return 'protected:release'
  }
  return `protected:${screen.protection}`
}

export function projectReleaseCommandCopyFeedback(
  outcome: Exclude<ReleaseCommandCopyOutcome, 'idle'>,
): ReleaseCommandCopyFeedback {
  return outcome === 'success'
    ? {
        ariaLive: 'polite',
        message: '실행 명령을 복사했습니다.',
        role: 'status',
        tone: 'success',
      }
    : {
        ariaLive: 'polite',
        message: '명령을 복사하지 못했습니다. 직접 선택해 복사해 주세요.',
        role: 'status',
        tone: 'failure',
      }
}

export function projectPublicPreviewScreen(
  bootstrap: PublicPreviewBootstrap,
): PublicPreviewScreenModel {
  if (
    bootstrap.setup.state === 'account_required' &&
    bootstrap.setup.reason === 'first_connection'
  ) {
    return projectAccountScreen(bootstrap.account)
  }
  if (
    bootstrap.setup.state === 'account_required' &&
    bootstrap.setup.reason === 'workspace_reauth'
  ) {
    return projectWorkspaceReauthScreen(bootstrap.account, bootstrap.setup)
  }
  if (bootstrap.account.state !== 'connected') {
    return projectProtectedAccountScreen(bootstrap.account)
  }
  switch (bootstrap.setup.state) {
    case 'input_required':
      return {
        ...connectedScreenBase(
          '학기 공간을 만들 준비를 해볼까요?',
          '학년과 학기, 새 학기 공간의 위치와 이름을 확인해 주세요.',
          [
            action('parent_select', '위치 선택', 'secondary'),
            action('prepare', '선택 내용 확인', 'primary'),
          ],
        ),
        surface: 'guided',
        stage: 'input',
        form: {
          yearLevelOptions: bootstrap.setup.yearLevelOptions,
          termOptions: bootstrap.setup.termOptions,
          parentName: bootstrap.setup.parentSelection?.displayName ?? null,
          safeDisplayLocation:
            bootstrap.setup.parentSelection?.safeDisplayLocation ?? null,
          suggestedLeafName: bootstrap.setup.suggestedLeafName,
        },
      }
    case 'confirmation_required':
      return {
        ...connectedScreenBase(
          '이대로 학기 공간을 만들까요?',
          '승인하기 전에는 새 학기 공간이나 설정 파일을 만들지 않습니다.',
          [
            action('parent_select', '위치 다시 선택', 'secondary'),
            action('approve', '학기 공간 만들기', 'primary'),
          ],
        ),
        surface: 'guided',
        stage: 'confirmation',
        summary: {
          semesterLabel: bootstrap.setup.semesterLabel,
          parentName: bootstrap.setup.parentSelection.displayName,
          workspaceName: bootstrap.setup.leafName,
          safeDisplayLocation:
            bootstrap.setup.parentSelection.safeDisplayLocation,
        },
      }
    case 'working':
      return {
        ...connectedScreenBase(
          '학기 공간을 준비하고 있어요',
          bootstrap.setup.displayMessage,
          [],
          true,
        ),
        surface: 'guided',
        stage: 'working',
        progress: workingProgress(bootstrap.setup.stage),
      }
    case 'transition_blocked':
      return bootstrap.setup.retry === 'resume'
        ? {
            ...connectedScreenBase(
              '학기 공간 연결을 이어갈 수 있어요',
              bootstrap.setup.displayMessage,
              [action('resume', '준비 계속하기', 'primary')],
            ),
            surface: 'protected',
            protection: 'transition',
          }
        : {
            ...connectedScreenBase(
              '같은 명령으로 다시 열어 주세요',
              bootstrap.setup.displayMessage,
              [],
            ),
            surface: 'protected',
            protection: 'restart',
          }
    case 'release_blocked':
      return {
        ...connectedScreenBase(
          '이 학기 공간은 다른 AY-PLE 버전과 연결되어 있어요',
          bootstrap.setup.displayMessage,
          [],
        ),
        surface: 'protected',
        protection: 'release',
        requiredApplicationCommand:
          bootstrap.setup.requiredApplicationCommand,
      }
    case 'recovery_required':
      return projectRecoveryScreen(bootstrap.setup)
    case 'ready':
      return {
        ...connectedScreenBase(
          '학기 공간 준비 완료',
          `${bootstrap.setup.semesterLabel}의 학기 공간과 Codex 연결을 확인했습니다.`,
          [],
        ),
        surface: 'ready',
        checks: [
          'Codex 연결 확인됨',
          '학기 공간 확인됨',
          'AY 작업 환경 확인됨',
        ],
        workspace: {
          semesterLabel: bootstrap.setup.semesterLabel,
          workspaceName: bootstrap.setup.workspaceName,
          safeDisplayLocation: bootstrap.setup.safeDisplayLocation,
        },
        boundaryCopy:
          '과목과 자료는 학기 공간 준비 완료의 조건이 아닙니다. 학기 내용 정리는 첫 자료를 가져오는 다음 여정에서 시작합니다.',
        nextJourney: {
          eyebrow: '다음 제품 여정 · COMING NEXT',
          label: '첫 자료 가져오기',
          disabled: true,
        },
      }
  }
}

export function createPublicPreviewCommand(
  bootstrap: PublicPreviewBootstrap,
  actionId: PublicPreviewAction['id'],
  draft?: PublicPreviewSemesterDraft,
): PublicPreviewCommand {
  const screen = projectPublicPreviewScreen(bootstrap)
  const actionAvailable =
    screen.actions.some(({ id }) => id === actionId) ||
    screen.accountAction?.id === actionId
  if (!actionAvailable) throw unavailableAction()

  switch (actionId) {
    case 'login_start':
      return { command: 'account.login.start' }
    case 'login_cancel':
      if (bootstrap.account.state !== 'login_pending') {
        throw unavailableAction()
      }
      return {
        command: 'account.login.cancel',
        attemptId: bootstrap.account.attemptId,
      }
    case 'logout':
      return { command: 'account.logout' }
    case 'account_retry':
      return { command: 'account.retry' }
    case 'parent_select':
      return { command: 'workspace.parent.select' }
    case 'prepare': {
      if (bootstrap.setup.state !== 'input_required') {
        throw unavailableAction()
      }
      if (bootstrap.setup.parentSelection === null) {
        throw new PublicPreviewActionError('위치를 먼저 선택해 주세요.')
      }
      const leafName = draft?.leafName.trim() ?? ''
      if (
        draft === undefined ||
        leafName.length === 0 ||
        !bootstrap.setup.yearLevelOptions.some(
          ({ value }) => value === draft.yearLevel,
        ) ||
        !bootstrap.setup.termOptions.some(({ value }) => value === draft.term)
      ) {
        throw new PublicPreviewActionError('입력 내용을 다시 확인해 주세요.')
      }
      return {
        command: 'setup.prepare',
        input: {
          yearLevel: draft.yearLevel,
          term: draft.term,
          parentSelectionId: bootstrap.setup.parentSelection.selectionId,
          leafName,
        },
      }
    }
    case 'approve':
      if (bootstrap.setup.state !== 'confirmation_required') {
        throw unavailableAction()
      }
      return {
        command: 'setup.approve',
        setupPlanId: bootstrap.setup.setupPlanId,
      }
    case 'resume':
      if (
        (bootstrap.setup.state === 'account_required' &&
          bootstrap.setup.reason === 'workspace_reauth' &&
          bootstrap.setup.resume === 'available') ||
        (bootstrap.setup.state === 'transition_blocked' &&
          bootstrap.setup.retry === 'resume')
      ) {
        return {
          command: 'setup.resume',
          recoveryId: bootstrap.setup.recoveryId,
        }
      }
      throw unavailableAction()
    case 'recover_resume':
    case 'recover_discard':
    case 'manual_guidance':
      if (bootstrap.setup.state !== 'recovery_required') {
        throw unavailableAction()
      }
      return {
        command:
          actionId === 'recover_resume'
            ? 'setup.recover.resume'
            : actionId === 'recover_discard'
              ? 'setup.recover.discard'
              : 'setup.recover.manual_guidance',
        recoveryId: bootstrap.setup.recoveryId,
      }
  }
}

function projectAccountScreen(
  account: PublicPreviewAccountProjection,
): PublicPreviewAccountScreen {
  switch (account.state) {
    case 'checking':
      return accountScreen(
        'Codex 연결을 확인하고 있어요',
        '잠시만 기다려 주세요.',
        true,
        [],
      )
    case 'login_required':
      return accountScreen(
        'AY와 연결할 준비를 해볼까요?',
        account.displayMessage,
        false,
        [
          action('login_start', 'ChatGPT로 Codex 연결', 'primary'),
          action('account_retry', '연결 상태 다시 확인', 'secondary'),
        ],
      )
    case 'login_starting':
      return accountScreen(
        '안전한 로그인 창을 준비하고 있어요',
        account.displayMessage,
        true,
        [],
      )
    case 'login_pending':
      return {
        ...accountScreen(
          'OpenAI에서 로그인을 완료해 주세요',
          '로그인을 마친 뒤 이 AY-PLE 탭으로 돌아오세요.',
          false,
          [action('login_cancel', '로그인 취소', 'secondary')],
        ),
        externalLoginUrl: account.authUrl,
      }
    case 'verifying':
      return accountScreen(
        'Codex 연결을 확인하고 있어요',
        account.displayMessage,
        true,
        [],
      )
    case 'connected':
      return accountScreen(
        'Codex가 연결되어 있어요',
        `${account.providerLabel} 연결을 확인했습니다.`,
        false,
        [action('logout', 'Codex 연결 해제', 'quiet')],
      )
    case 'unsupported_account':
      return accountScreen(
        'ChatGPT로 다시 연결해 주세요',
        account.displayMessage,
        false,
        [action('logout', '현재 연결 해제', 'primary')],
      )
    case 'unavailable':
      return accountScreen(
        '계정 상태를 확인하지 못했어요',
        account.displayMessage,
        false,
        [action('account_retry', '다시 확인', 'primary')],
      )
  }
}

function accountScreen(
  title: string,
  message: string,
  busy: boolean,
  actions: readonly PublicPreviewAction[],
): PublicPreviewAccountScreen {
  return {
    surface: 'account',
    title,
    message,
    busy,
    actions,
  }
}

function projectWorkspaceReauthScreen(
  account: PublicPreviewAccountProjection,
  setup: Extract<
    PublicPreviewSetupProjection,
    { readonly state: 'account_required'; readonly reason: 'workspace_reauth' }
  >,
): PublicPreviewProtectedScreen {
  if (setup.resume === 'available') {
    return {
      ...connectedScreenBase(
        '학기 공간 연결을 이어갈 수 있어요',
        setup.displayMessage,
        [action('resume', '준비 계속하기', 'primary')],
      ),
      surface: 'protected',
      protection: 'transition',
    }
  }
  const accountModel = projectAccountScreen(account)
  return {
    surface: 'protected',
    protection: 'account',
    title:
      account.state === 'unsupported_account'
        ? 'ChatGPT로 다시 연결해 주세요'
        : account.state === 'unavailable'
          ? '계정 상태를 확인하지 못했어요'
          : 'Codex를 다시 연결해 주세요',
    message: `${setup.displayMessage} 학기 공간은 그대로 보관되어 있습니다.`,
    busy: accountModel.busy,
    actions: accountModel.actions,
    externalLoginUrl: accountModel.externalLoginUrl,
  }
}

function projectProtectedAccountScreen(
  account: PublicPreviewAccountProjection,
): PublicPreviewProtectedScreen {
  const accountModel = projectAccountScreen(account)
  return {
    surface: 'protected',
    protection: 'account',
    title: accountModel.title,
    message: `${accountModel.message} 현재 학기 공간은 변경하지 않습니다.`,
    busy: accountModel.busy,
    actions: accountModel.actions,
    externalLoginUrl: accountModel.externalLoginUrl,
  }
}

function projectRecoveryScreen(
  setup: Extract<
    PublicPreviewSetupProjection,
    { readonly state: 'recovery_required' }
  >,
): PublicPreviewProtectedScreen {
  if (setup.reason === 'owned_incomplete') {
    return {
      ...connectedScreenBase(
        '만들던 학기 공간을 이어갈까요?',
        `${setup.displayMessage} 확인되지 않은 파일은 자동으로 지우지 않습니다.`,
        [
          action('recover_resume', '계속 만들기', 'primary'),
          action(
            'recover_discard',
            '미완성 항목 안전하게 정리',
            'danger',
          ),
        ],
      ),
      surface: 'protected',
      protection: 'safe_recovery',
    }
  }
  if (setup.reason === 'bundle_missing') {
    return {
      ...connectedScreenBase(
        'AY 기본 도움 파일 일부가 빠졌어요',
        `${setup.displayMessage} 학기 공간의 다른 파일은 변경하지 않습니다.`,
        [action('recover_resume', '안전하게 복구', 'primary')],
      ),
      surface: 'protected',
      protection: 'safe_recovery',
    }
  }
  return {
    ...connectedScreenBase(
      '자동으로 바꾸지 않은 설정이 있어요',
      `${setup.displayMessage} 기존 파일을 보존한 채 직접 확인이 필요합니다.`,
      [action('manual_guidance', '확인 방법 보기', 'primary')],
    ),
    surface: 'protected',
    protection: 'manual_recovery',
  }
}

function connectedScreenBase(
  title: string,
  message: string,
  actions: readonly PublicPreviewAction[],
  busy = false,
): PublicPreviewScreenBase {
  return {
    title,
    message,
    busy,
    actions,
    accountAction: action('logout', 'Codex 연결 해제', 'quiet'),
  }
}

function workingProgress(
  stage: Extract<
    PublicPreviewSetupProjection,
    { readonly state: 'working' }
  >['stage'],
): PublicPreviewGuidedWorkingScreen['progress'] {
  if (stage === 'verifying_environment') {
    return [
      { label: '학기 공간 만들기', state: 'complete' },
      { label: 'AY 기본 도움 기능 준비', state: 'complete' },
      { label: 'Codex 연결 확인', state: 'active' },
    ]
  }
  return [
    { label: '학기 공간 만들기', state: 'active' },
    { label: 'AY 기본 도움 기능 준비', state: 'upcoming' },
    { label: 'Codex 연결 확인', state: 'upcoming' },
  ]
}

function action(
  id: PublicPreviewAction['id'],
  label: string,
  hierarchy: PublicPreviewAction['hierarchy'],
): PublicPreviewAction {
  return { id, label, hierarchy }
}

function unavailableAction(): Error {
  return new PublicPreviewActionError(
    '현재 화면에서는 실행할 수 없습니다.',
  )
}
