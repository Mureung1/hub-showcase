import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
  PUBLIC_PREVIEW_SCENARIO_FIXTURES,
  PUBLIC_PREVIEW_SETUP_FIXTURES,
} from '@ay-ple/product-contract/testing'

import {
  createPublicPreviewCommand,
  projectPublicPreviewScreen,
} from './public-preview-view-model.js'

test('Account screen exposes only the command actions allowed by each frozen state', () => {
  const cases = [
    ['checking', [], true],
    ['loginRequired', ['login_start', 'account_retry'], false],
    ['loginStarting', [], true],
    ['loginPending', ['login_cancel'], false],
    ['verifying', [], true],
    ['unsupportedAccount', ['logout'], false],
    ['unavailable', ['account_retry'], false],
  ] as const

  for (const [fixtureName, actionIds, busy] of cases) {
    const account = PUBLIC_PREVIEW_ACCOUNT_FIXTURES[fixtureName]
    const screen = projectPublicPreviewScreen({
      account,
      setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
    })

    assert.equal(screen.surface, 'account', fixtureName)
    assert.equal(screen.busy, busy, fixtureName)
    assert.deepEqual(
      screen.actions.map(({ id }) => id),
      actionIds,
      fixtureName,
    )
  }
})

test('connected Account keeps logout available without replacing the Setup decision', () => {
  const screen = projectPublicPreviewScreen({
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.inputRequired,
  })

  assert.equal(screen.surface, 'guided')
  assert.deepEqual(screen.accountAction, {
    id: 'logout',
    label: 'Codex 연결 해제',
    hierarchy: 'quiet',
  })
})

test('Guided Setup keeps input, final confirmation, and working as distinct decisions', () => {
  const input = projectPublicPreviewScreen({
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.inputRequired,
  })
  assert.equal(input.surface, 'guided')
  if (input.surface !== 'guided') return
  assert.equal(input.stage, 'input')
  assert.deepEqual(
    input.actions.map(({ id, hierarchy }) => ({ id, hierarchy })),
    [
      { id: 'parent_select', hierarchy: 'secondary' },
      { id: 'prepare', hierarchy: 'primary' },
    ],
  )
  assert.deepEqual(input.form, {
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
    parentName: 'Documents',
    safeDisplayLocation: 'Home › Documents',
    suggestedLeafName: '2026-2학기',
  })

  const confirmation = projectPublicPreviewScreen({
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.confirmationRequired,
  })
  assert.equal(confirmation.surface, 'guided')
  if (confirmation.surface !== 'guided') return
  assert.equal(confirmation.stage, 'confirmation')
  assert.equal(confirmation.title, '이대로 학기 공간을 만들까요?')
  assert.deepEqual(
    confirmation.actions.map(({ id, hierarchy }) => ({ id, hierarchy })),
    [
      { id: 'parent_select', hierarchy: 'secondary' },
      { id: 'approve', hierarchy: 'primary' },
    ],
  )

  const working = projectPublicPreviewScreen({
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.working,
  })
  assert.equal(working.surface, 'guided')
  if (working.surface !== 'guided') return
  assert.equal(working.stage, 'working')
  assert.equal(working.busy, true)
  assert.deepEqual(working.actions, [])
  assert.deepEqual(working.progress, [
    { label: '학기 공간 만들기', state: 'active' },
    { label: 'AY 기본 도움 기능 준비', state: 'upcoming' },
    { label: 'Codex 연결 확인', state: 'upcoming' },
  ])
})

test('protected states expose only their allowlisted recovery commands', () => {
  const cases = [
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.workspaceReauthAwaitingAccount,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
      ['login_start', 'account_retry'],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.workspaceReauthAvailable,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      ['resume'],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.transitionResume,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      ['resume'],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.transitionRestart,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      [],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.releaseBlocked,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      [],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.ownedIncompleteRecovery,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      ['recover_resume', 'recover_discard'],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.bundleMissingRecovery,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      ['recover_resume'],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.bundleConflictRecovery,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      ['manual_guidance'],
    ],
    [
      PUBLIC_PREVIEW_SETUP_FIXTURES.contextConflictRecovery,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
      ['manual_guidance'],
    ],
  ] as const

  for (const [setup, account, actionIds] of cases) {
    const screen = projectPublicPreviewScreen({ account, setup })
    assert.equal(screen.surface, 'protected', setup.state)
    assert.deepEqual(
      screen.actions.map(({ id }) => id),
      actionIds,
      setup.state,
    )
  }
})

test('Compact Ready describes validated setup without synthesizing academic capability', () => {
  const screen = projectPublicPreviewScreen({
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.ready,
  })

  assert.equal(screen.surface, 'ready')
  if (screen.surface !== 'ready') return
  assert.equal(screen.title, '학기 공간 준비 완료')
  assert.deepEqual(screen.checks, [
    'Codex 연결 확인됨',
    '학기 공간 확인됨',
    'AY 작업 환경 확인됨',
  ])
  assert.deepEqual(screen.workspace, {
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: 'Home › Documents › 2026-2학기',
  })
  assert.deepEqual(screen.nextJourney, {
    eyebrow: '다음 제품 여정 · COMING NEXT',
    label: '첫 자료 가져오기',
    disabled: true,
  })
  assert.equal(screen.boundaryCopy.includes('과목과 자료'), true)
  assert.equal(JSON.stringify(screen).includes('0개'), false)
})

test('visible public preview actions build only their exact allowlisted commands', () => {
  const input = {
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.inputRequired,
  } as const
  assert.deepEqual(
    createPublicPreviewCommand(input, 'prepare', {
      yearLevel: 2,
      term: '2',
      leafName: ' 2026-2학기 ',
    }),
    {
      command: 'setup.prepare',
      input: {
        yearLevel: 2,
        term: '2',
        parentSelectionId: 'parent_selection_primary',
        leafName: '2026-2학기',
      },
    },
  )
  assert.deepEqual(
    createPublicPreviewCommand(
      {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
      },
      'login_cancel',
    ),
    {
      command: 'account.login.cancel',
      attemptId: 'account_attempt_primary',
    },
  )
  assert.deepEqual(
    createPublicPreviewCommand(
      {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.confirmationRequired,
      },
      'approve',
    ),
    {
      command: 'setup.approve',
      setupPlanId: 'setup_plan_primary',
    },
  )
  assert.deepEqual(
    createPublicPreviewCommand(
      {
        account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
        setup: PUBLIC_PREVIEW_SETUP_FIXTURES.ownedIncompleteRecovery,
      },
      'recover_discard',
    ),
    {
      command: 'setup.recover.discard',
      recoveryId: 'setup_recovery_primary',
    },
  )
})

test('stale, unavailable, and invalid draft actions fail closed before transport', () => {
  const ready = {
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.ready,
  } as const
  assert.throws(
    () => createPublicPreviewCommand(ready, 'prepare'),
    /현재 화면에서는 실행할 수 없습니다/,
  )

  const input = {
    account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    setup: PUBLIC_PREVIEW_SETUP_FIXTURES.inputRequired,
  } as const
  assert.throws(
    () =>
      createPublicPreviewCommand(input, 'prepare', {
        yearLevel: 9,
        term: 'summer',
        leafName: ' ',
      }),
    /입력 내용을 다시 확인해 주세요/,
  )

  const noParent = {
    ...input,
    setup: {
      ...input.setup,
      parentSelection: null,
    },
  }
  assert.throws(
    () =>
      createPublicPreviewCommand(noParent, 'prepare', {
        yearLevel: 2,
        term: '2',
        leafName: '2026-2학기',
      }),
    /위치를 먼저 선택해 주세요/,
  )
})

test('the frozen render roster never projects private authority into screen models', () => {
  const forbidden = [
    'account_attempt_',
    'parent_selection_',
    'setup_plan_',
    'setup_recovery_',
    '/Users/',
    'CODEX_HOME',
    'receipt',
    'digest',
    'Runtime',
    'threadId',
  ]

  for (const scenario of PUBLIC_PREVIEW_SCENARIO_FIXTURES) {
    const rendered = JSON.stringify(
      projectPublicPreviewScreen(scenario.response.projection),
    )
    for (const value of forbidden) {
      assert.equal(
        rendered.includes(value),
        false,
        `${scenario.name} exposed ${value}`,
      )
    }
  }
})
