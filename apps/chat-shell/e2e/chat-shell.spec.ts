import { expect } from 'playwright/test'

import {
  interruptFollowUpPrompt,
  scenarioPrompts,
  test,
} from './chat-shell-harness.js'

test('streams one native AgentMessage through the real Server and reconciles its terminal', async ({
  chatHarness,
  chatPage: page,
}) => {
  await expect(runtimeStatus(page)).toHaveAttribute(
    'data-runtime-status',
    'configured',
  )

  await page.getByRole('button', { name: '새 대화' }).click()
  await expect(runtimeStatus(page)).toHaveAttribute(
    'data-runtime-status',
    'starting',
  )
  await expect(page.getByText('thread-native-nominal', { exact: true })).toBeVisible()
  await expect(runtimeStatus(page)).toHaveAttribute(
    'data-runtime-status',
    'ready',
  )

  await sendPrompt(page, scenarioPrompts.nominal)
  await expect(page.getByText(scenarioPrompts.nominal, { exact: true })).toBeVisible()
  await expect(page.getByText('핵심은', { exact: true })).toBeVisible()
  await expect(conversationPhase(page)).toHaveAttribute(
    'data-conversation-phase',
    'running',
  )
  await expect(page.getByText('Item ID · item-native-nominal-1')).toBeVisible()

  await expect(
    page.getByText('핵심은 개념 사이의 연결입니다.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('답변을 완료했어요', { exact: true })).toBeVisible()
  await expect(conversationPhase(page)).toHaveAttribute(
    'data-conversation-phase',
    'completed',
  )
  await expect(page.getByText('AY가 답변을 정리하고 있어요')).toHaveCount(0)
  expect(chatHarness.calls().map((call) => call.operation)).toEqual([
    'startThread',
    'startTurn',
  ])
})

test.describe('retryable turn observation', () => {
  test.use({ scenario: 'retryable-error' })

  test('keeps the turn active until its later matching terminal', async ({
    chatHarness,
    chatPage: page,
  }) => {
    await startConversation(page)
    await sendPrompt(page, scenarioPrompts['retryable-error'])

    await expect(
      page.getByText('연결을 다시 시도하고 있어요', { exact: true }),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'running',
    )
    await expect(page.getByText('다시 연결했습니다.', { exact: true })).toBeVisible()
    await expect(
      page.getByText('다시 연결한 뒤 답변을 완료했습니다.', { exact: true }),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'completed',
    )
    expect(chatHarness.calls().map((call) => call.operation)).toEqual([
      'startThread',
      'startTurn',
    ])
  })
})

test.describe('authoritative failed terminal', () => {
  test.use({ scenario: 'terminal-failure' })

  test('renders turn failure without marking the runtime status failed', async ({
    chatHarness,
    chatPage: page,
  }) => {
    await startConversation(page)
    await sendPrompt(page, scenarioPrompts['terminal-failure'])

    await expect(page.getByText('답변을 준비했지만', { exact: true })).toBeVisible()
    await expect(
      page.getByText('이번 답변을 완료하지 못했어요', { exact: true }),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'turn-failed',
    )
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'ready',
    )
    await expect(page.getByText('답변 중', { exact: true })).toHaveCount(0)
    expect(chatHarness.calls().map((call) => call.operation)).toEqual([
      'startThread',
      'startTurn',
    ])
  })
})

test.describe('process-wide runtime terminal', () => {
  test.use({ scenario: 'runtime-failure' })

  test('refreshes status and closes new mutations after runtime.failed', async ({
    chatPage: page,
  }) => {
    await startConversation(page)
    await sendPrompt(page, scenarioPrompts['runtime-failure'])

    await expect(
      page.getByText('대화 연결을 계속할 수 없어요', { exact: true }),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'runtime-failed',
    )
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'failed',
    )
    await expect(page.getByRole('button', { name: '새 대화' })).toBeDisabled()
    await expect(page.getByText('답변 중', { exact: true })).toHaveCount(0)
  })
})

test.describe('pre-acceptance mutation outcome', () => {
  test('refreshes status exactly once and closes mutations when the outcome is unknown', async ({
    chatPage: page,
  }) => {
    await startConversation(page)
    let releaseStatus: (() => void) | undefined
    const statusGate = new Promise<void>((resolve) => {
      releaseStatus = resolve
    })
    let statusRequests = 0
    let turnRequests = 0

    await page.route('**/api/codex-chat/status', async (route) => {
      statusRequests += 1
      await statusGate
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          state: 'failed',
          approvalMode: 'deny_all',
          sandbox: 'read_only',
          sourceCommit: 'test-source-commit',
          runtimeVersion: '0.144.4',
          failureCode: 'sdk_operation_failed',
        }),
      })
    })
    await page.route('**/api/codex-chat/threads/*/turns', async (route) => {
      turnRequests += 1
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'sdk_operation_failed',
          displayMessage: 'The Codex runtime failed.',
          unknownOutcome: true,
        }),
      })
    })

    try {
      await sendPrompt(page, scenarioPrompts.nominal)
      await expect(conversationPhase(page)).toHaveAttribute(
        'data-conversation-phase',
        'request-failed',
      )
      await expect.poll(() => statusRequests).toBe(1)
      await expect(runtimeStatus(page)).toHaveAttribute(
        'data-runtime-status',
        'loading',
      )
      await expect(page.getByRole('button', { name: '새 대화' })).toBeDisabled()

      releaseStatus?.()
      await expect(runtimeStatus(page)).toHaveAttribute(
        'data-runtime-status',
        'failed',
      )
      await expect(page.getByRole('button', { name: '새 대화' })).toBeDisabled()
      await expect(page.getByRole('textbox', { name: '메시지' })).toBeDisabled()
      await expect(
        page.getByRole('button', { name: '메시지 보내기' }),
      ).toBeDisabled()
      expect(statusRequests).toBe(1)
      expect(turnRequests).toBe(1)
    } finally {
      releaseStatus?.()
    }
  })

  test('keeps mutations disabled when the unknown-outcome status refresh fails', async ({
    chatPage: page,
  }) => {
    await startConversation(page)
    let statusRequests = 0
    let turnRequests = 0

    await page.route('**/api/codex-chat/status', async (route) => {
      statusRequests += 1
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'test_status_failure',
          displayMessage: 'The status endpoint failed.',
        }),
      })
    })
    await page.route('**/api/codex-chat/threads/*/turns', async (route) => {
      turnRequests += 1
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'sdk_operation_failed',
          displayMessage: 'The Codex runtime failed.',
          unknownOutcome: true,
        }),
      })
    })

    await sendPrompt(page, scenarioPrompts.nominal)
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'request-failed',
    )
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'error',
    )
    await expect(page.getByRole('button', { name: '새 대화' })).toBeDisabled()
    await expect(page.getByRole('textbox', { name: '메시지' })).toBeDisabled()
    await expect(
      page.getByRole('button', { name: '메시지 보내기' }),
    ).toBeDisabled()
    expect(statusRequests).toBe(1)
    expect(turnRequests).toBe(1)
  })

  test('does not refresh status or retry a known rejection', async ({
    chatPage: page,
  }) => {
    await startConversation(page)
    let statusRequests = 0
    let turnRequests = 0

    await page.route('**/api/codex-chat/status', async (route) => {
      statusRequests += 1
      await route.abort()
    })
    await page.route('**/api/codex-chat/threads/*/turns', async (route) => {
      turnRequests += 1
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'sdk_request_failed',
          displayMessage: 'Codex rejected the requested operation.',
          unknownOutcome: false,
        }),
      })
    })

    await sendPrompt(page, scenarioPrompts.nominal)
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'request-failed',
    )
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'ready',
    )
    await expect(page.getByRole('button', { name: '새 대화' })).toBeEnabled()
    expect(statusRequests).toBe(0)
    expect(turnRequests).toBe(1)
  })
})

test.describe('interrupt and same-thread follow-up', () => {
  test.use({ scenario: 'interrupt-follow-up' })

  test('keeps the 202 acknowledgement nonterminal, waits for EOF, and reuses the native thread', async ({
    chatHarness,
    chatPage: page,
  }) => {
    const threadId = 'thread-native-interrupt-follow-up'
    const firstTurnId = 'turn-native-interrupt-follow-up-1'
    const secondTurnId = 'turn-native-interrupt-follow-up-2'

    await startConversation(page)
    await expect(page.getByText(threadId, { exact: true })).toBeVisible()
    await sendPrompt(page, scenarioPrompts['interrupt-follow-up'])

    await expect(
      page.getByText('중단 전까지 작성한 답변입니다.', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(`Turn ID · ${firstTurnId}`, { exact: true }).first(),
    ).toBeVisible()
    await expect(
      page.getByText('Item ID · item-native-interrupt-follow-up-1', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'running',
    )
    await page.getByRole('button', { name: '답변 중단' }).click()

    await expect(
      page.getByRole('button', { name: '중단 확인 대기' }),
    ).toBeDisabled()
    await expect(
      page.getByText('중단 요청을 확인했어요. 최종 상태를 기다리고 있어요', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'stopping',
    )
    await expect(page.getByText('답변이 중단됐어요', { exact: true })).toHaveCount(
      0,
    )

    await expect(page.getByText('답변이 중단됐어요', { exact: true })).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'interrupted',
    )
    await expect(page.getByText('미완료', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: '메시지' })).toBeDisabled()

    await expect(page.getByRole('textbox', { name: '메시지' })).toBeEnabled()
    await sendPrompt(page, interruptFollowUpPrompt)
    await expect(
      page.getByText(`Turn ID · ${secondTurnId}`, { exact: true }).first(),
    ).toBeVisible()
    await expect(
      page.getByText('Item ID · item-native-interrupt-follow-up-2', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByText('같은 대화에서 두 번째 답변을 완료했습니다.', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'completed',
    )
    await expect(page.getByText(threadId, { exact: true })).toBeVisible()

    expect(chatHarness.calls()).toEqual([
      { operation: 'startThread' },
      {
        operation: 'startTurn',
        input: {
          threadId,
          text: scenarioPrompts['interrupt-follow-up'],
        },
      },
      {
        operation: 'interrupt',
        input: { threadId, turnId: firstTurnId },
      },
      {
        operation: 'startTurn',
        input: { threadId, text: interruptFollowUpPrompt },
      },
    ])
  })
})

test.describe('interrupt control failure', () => {
  test.use({ scenario: 'interrupt-failure' })

  test('shows a safe control failure while the authoritative stream continues', async ({
    chatHarness,
    chatPage: page,
  }) => {
    const threadId = 'thread-native-interrupt-failure'
    const turnId = 'turn-native-interrupt-failure-1'

    await startConversation(page)
    await sendPrompt(page, scenarioPrompts['interrupt-failure'])
    await expect(
      page.getByText('중단 요청과 별개로', { exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: '답변 중단' }).click()

    await expect(
      page.getByText('답변 중단을 요청하지 못했어요', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText(
        '답변은 계속 진행 중입니다. 필요하면 다시 중단을 요청해 주세요.',
        { exact: true },
      ),
    ).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'running',
    )
    await expect(page.getByText('test-only interrupt control failure')).toHaveCount(
      0,
    )

    await expect(
      page.getByText('중단 요청과 별개로 답변을 완료했습니다.', {
        exact: true,
      }),
    ).toBeVisible()
    await expect(page.getByText('답변을 완료했어요', { exact: true })).toBeVisible()
    await expect(conversationPhase(page)).toHaveAttribute(
      'data-conversation-phase',
      'completed',
    )
    await expect(
      page.getByText('중단 요청과 별개로 답변의 최종 상태를 확인했습니다.', {
        exact: true,
      }),
    ).toBeVisible()

    expect(chatHarness.calls()).toEqual([
      { operation: 'startThread' },
      {
        operation: 'startTurn',
        input: { threadId, text: scenarioPrompts['interrupt-failure'] },
      },
      { operation: 'interrupt', input: { threadId, turnId } },
    ])
  })
})

test.describe('unavailable runtime', () => {
  test.use({ scenario: 'unavailable' })

  test('keeps the existing app available while chat mutations stay disabled', async ({
    chatHarness,
    chatPage: page,
  }) => {
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'unavailable',
    )
    await expect(page.getByRole('button', { name: '새 대화' })).toBeDisabled()
    await expect(
      page.getByText('대화를 시작하려면 서버 설정이 필요합니다.'),
    ).toBeVisible()
    expect(chatHarness.calls()).toEqual([])
  })
})

test.describe('failed runtime startup', () => {
  test.use({ scenario: 'failed-start' })

  test('shows configured, starting, and failed as distinct runtime states', async ({
    chatPage: page,
  }) => {
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'configured',
    )
    await page.getByRole('button', { name: '새 대화' }).click()
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'starting',
    )
    await expect(runtimeStatus(page)).toHaveAttribute(
      'data-runtime-status',
      'failed',
    )
    await expect(page.getByRole('button', { name: '새 대화' })).toBeDisabled()
  })
})

test('distinguishes initial loading, empty conversation, and status failure', async ({
  chatHarness,
  page,
}) => {
  let releaseStatus: (() => void) | undefined
  const statusGate = new Promise<void>((resolve) => {
    releaseStatus = resolve
  })
  await page.route('**/api/codex-chat/status', async (route) => {
    await statusGate
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'test_status_failure',
        displayMessage: 'The status endpoint failed.',
      }),
    })
  })

  await page.goto(chatHarness.url)
  await expect(runtimeStatus(page)).toHaveAttribute(
    'data-runtime-status',
    'loading',
  )
  await expect(
    page.getByText('대화를 시작해 볼까요?', { exact: true }),
  ).toBeVisible()

  releaseStatus?.()
  await expect(runtimeStatus(page)).toHaveAttribute(
    'data-runtime-status',
    'error',
  )
  await expect(page.getByRole('button', { name: '다시 확인' })).toBeVisible()
  await expect(page.getByRole('button', { name: '새 대화' })).toBeDisabled()
})

test('renders malformed HTTP stream as one safe runtime failure', async ({
  chatHarness,
  chatPage: page,
}) => {
  await startConversation(page)
  await page.route('**/api/codex-chat/threads/*/turns', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: '{"type":"turn.accepted","rawSecret":"must-not-render"}\n',
    })
  })
  await sendPrompt(page, scenarioPrompts.nominal)

  await expect(conversationPhase(page)).toHaveAttribute(
    'data-conversation-phase',
    'runtime-failed',
  )
  await expect(
    page.getByText('대화 응답을 확인하지 못했어요', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('must-not-render')).toHaveCount(0)
  expect(chatHarness.calls().map((call) => call.operation)).toEqual([
    'startThread',
  ])
})

function runtimeStatus(page: import('playwright/test').Page) {
  return page.getByRole('region', { name: '대화 서비스 상태' })
}

function conversationPhase(page: import('playwright/test').Page) {
  return page.locator('[data-conversation-phase]')
}

async function startConversation(page: import('playwright/test').Page) {
  await expect(runtimeStatus(page)).toHaveAttribute(
    'data-runtime-status',
    'configured',
  )
  await page.getByRole('button', { name: '새 대화' }).click()
  await expect(runtimeStatus(page)).toHaveAttribute(
    'data-runtime-status',
    'ready',
  )
}

async function sendPrompt(
  page: import('playwright/test').Page,
  prompt: string,
) {
  await page.getByRole('textbox', { name: '메시지', exact: true }).fill(prompt)
  await page.getByRole('button', { name: '메시지 보내기' }).click()
}
