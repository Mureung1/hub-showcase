import { expect } from 'playwright/test'

import { scenarioPrompts, test } from './chat-shell-harness.js'

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
  await expect(page.getByText('item · item-native-nominal-1')).toBeVisible()

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
    expect(chatHarness.calls().map((call) => call.operation)).toEqual([
      'startThread',
      'startTurn',
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
    await expect(page.getByText('Runtime 설정이 필요합니다.')).toBeVisible()
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
    page.getByText('대화 스트림을 확인할 수 없습니다.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('must-not-render')).toHaveCount(0)
  expect(chatHarness.calls().map((call) => call.operation)).toEqual([
    'startThread',
  ])
})

function runtimeStatus(page: import('playwright/test').Page) {
  return page.getByRole('region', { name: 'Codex 런타임 상태' })
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
