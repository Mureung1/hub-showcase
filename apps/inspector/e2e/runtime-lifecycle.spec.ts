import { expect, type Locator, type Page, type Response } from 'playwright/test'
import type { RuntimeRunLog } from '@ay-ple/runtime-core'
import { test } from './inspector-harness.js'

const deterministicFailure = 'Fake runtime deterministic failure requested'
const restartRecoveryError = 'Runtime interrupted by server restart'
const streamingPrompt = 'stream this prompt'
const cancellationPrompt = 'cancel this prompt'
const failurePrompt = 'fail this prompt'
const restartPrompt = 'restore this completed run'
const interruptedPrompt = 'recover this interrupted stream'
const activeClearPrompt = 'keep streaming while history clears'

type RunLogResponseMatch = { prompt: string } | { runId: string }

test('Inspector exposes deterministic fake run lifecycle through real HTTP and SSE', async ({
  inspectorPage: page,
}) => {
  const run = page.getByRole('region', { name: 'Run', exact: true })
  const transcript = page.getByRole('region', { name: 'Transcript' })
  const events = page.getByRole('region', { name: 'Events' })
  const runLog = page.getByRole('region', { name: 'Run Log' })
  const history = page.getByRole('region', { name: 'History' })

  await expect(page.getByText('API connected', { exact: true })).toBeVisible()
  await expect(run.getByLabel('Adapter')).toHaveValue('fake')

  const completedLogResponse = waitForRunLogResponse(page, {
    prompt: streamingPrompt,
  })
  const completedRun = await startFakeRun(page, streamingPrompt)

  await expectEventTypes(events, ['started', 'output_delta'])
  await expect(run).toContainText('Running')
  await expect(run.getByRole('button', { name: 'Cancel' })).toBeEnabled()
  await expect(transcript).toContainText(
    `Fake runtime received: "${streamingPrompt}".`,
  )
  await expectEventTypes(events, [
    'started',
    'output_delta',
    'output_delta',
    'completed',
  ])
  await expect(run).toContainText('Completed')
  await expect(transcript).toContainText(
    'This deterministic response proves the inspector can observe a run end to end.',
  )

  const completedLog = await readRunLog(await completedLogResponse)

  expect(completedLog.runId).toBe(completedRun.runId)
  expect(completedLog.debugLog).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source: 'fake-runtime',
        kind: 'run_started',
        message: 'Fake runtime accepted a run',
        data: {
          prompt: streamingPrompt,
          runId: completedRun.runId,
        },
      }),
    ]),
  )
  await expect(runLog.locator('pre')).toHaveText(
    JSON.stringify(completedLog, null, 2),
  )

  const cancelledRun = await startFakeRun(page, cancellationPrompt)

  await expectEventTypes(events, ['started', 'output_delta'])
  const cancelledLogResponse = waitForRunLogResponse(page, {
    runId: cancelledRun.runId,
  })
  const cancelResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname ===
        `/api/runtime/runs/${cancelledRun.runId}/cancel`,
  )
  await run.getByRole('button', { name: 'Cancel' }).click()
  const cancelResponse = await cancelResponsePromise
  const cancelledLog = await readRunLog(cancelResponse)

  expect(cancelledLog.status).toBe('cancelled')
  await expectEventTypes(events, ['started', 'output_delta', 'cancelled'])
  await expect(run).toContainText('Cancelled')
  await expect(run.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  expect(await readRunLog(await cancelledLogResponse)).toEqual(cancelledLog)

  await run.getByLabel('Fake Scenario').selectOption('failure')
  const failedLogResponse = waitForRunLogResponse(page, {
    prompt: failurePrompt,
  })
  const failedRun = await startFakeRun(page, failurePrompt)

  await expectEventTypes(events, ['started', 'failed'])
  await expect(run).toContainText('Failed')
  await expect(run.getByText(deterministicFailure, { exact: true })).toBeVisible()
  await expect(transcript).toContainText(`Run failed: ${deterministicFailure}`)

  const failedLog = await readRunLog(await failedLogResponse)

  expect(failedLog.runId).toBe(failedRun.runId)
  expect(failedLog.status).toBe('failed')
  expect(failedLog.error).toBe(deterministicFailure)
  await expect(runLog.locator('pre')).toHaveText(
    JSON.stringify(failedLog, null, 2),
  )

  const historyItems = history.locator('.history-item')

  await expect(historyItems).toHaveCount(3)
  await expect(historyItems.filter({ hasText: 'completed' })).toHaveCount(1)
  await expect(historyItems.filter({ hasText: 'cancelled' })).toHaveCount(1)
  await expect(historyItems.filter({ hasText: 'failed' })).toHaveCount(1)
  await expect(
    historyItems.filter({ hasText: /\b(?:running|cancelling)\b/ }),
  ).toHaveCount(0)

  const selectedLogResponse = waitForRunLogResponse(page, {
    runId: completedRun.runId,
  })
  await historyItems.filter({ hasText: 'completed' }).click()
  const selectedLog = await readRunLog(await selectedLogResponse)

  expect(selectedLog).toEqual(completedLog)
  await expect(runLog.locator('pre')).toHaveText(
    JSON.stringify(selectedLog, null, 2),
  )
  await expect(transcript).toContainText(streamingPrompt)
  await expectEventTypes(events, [
    'started',
    'output_delta',
    'output_delta',
    'completed',
  ])

  const clearButton = history.getByRole('button', {
    name: 'Clear terminal history',
  })

  await expect(clearButton).toHaveAttribute('title', 'Clear terminal history')
  await expect(clearButton.locator('svg.lucide-trash-2')).toHaveCount(1)
  await expect(clearButton).toHaveText('')
  await expect(clearButton).toBeEnabled()
  await expect(clearButton).toHaveCSS('width', '32px')
  await expect(clearButton).toHaveCSS('height', '32px')
  await expectLocatorsNotToOverlap(
    history.getByRole('heading', { name: 'History' }),
    clearButton,
  )
  await expectLocatorsNotToOverlap(history.locator('.history-count'), clearButton)

  let releaseClearRequest = () => {}
  const clearRequestGate = new Promise<void>((resolve) => {
    releaseClearRequest = resolve
  })

  await page.route('**/api/runtime/runs', async (route) => {
    if (route.request().method() === 'DELETE') {
      await clearRequestGate
    }

    await route.continue()
  })

  const clearRequest = clearTerminalHistory(page, clearButton)

  await expect(clearButton).toBeDisabled()
  await expect(clearButton).toHaveAttribute('aria-busy', 'true')
  releaseClearRequest()

  const clearedRunIds = await clearRequest

  await page.unroute('**/api/runtime/runs')

  expect(new Set(clearedRunIds)).toEqual(
    new Set([completedRun.runId, cancelledRun.runId, failedRun.runId]),
  )
  await expect(historyItems).toHaveCount(0)
  await expect(history.locator('.history-count')).toHaveText('0')
  await expect(clearButton).toBeDisabled()
  await expect(clearButton).toHaveAttribute('aria-busy', 'false')
  await expect(transcript).toContainText('No transcript yet')
  await expect(events.getByRole('listitem')).toHaveCount(0)
  await expect(runLog.locator('pre')).toHaveText('{}')
  await expect(run).toContainText('Ready')
})

test('Inspector clears terminal history without interrupting the selected active run', async ({
  inspectorPage: page,
}) => {
  const run = page.getByRole('region', { name: 'Run', exact: true })
  const transcript = page.getByRole('region', { name: 'Transcript' })
  const events = page.getByRole('region', { name: 'Events' })
  const runLog = page.getByRole('region', { name: 'Run Log' })
  const history = page.getByRole('region', { name: 'History' })
  const historyItems = history.locator('.history-item')
  const clearButton = history.getByRole('button', {
    name: 'Clear terminal history',
  })
  const eventStreamRequests = trackRuntimeEventStreamRequests(page)

  await expect(page.getByText('API connected', { exact: true })).toBeVisible()
  await expect(clearButton).toBeDisabled()
  await run.getByLabel('Fake Scenario').selectOption('failure')

  const terminalRun = await startFakeRun(page, 'terminal history to clear')

  await expectEventTypes(events, ['started', 'failed'])
  await expect(historyItems).toHaveCount(1)
  await expect(clearButton).toBeEnabled()

  await run.getByLabel('Fake Scenario').selectOption('normal')
  const activeRun = await startFakeRun(page, activeClearPrompt)
  const activeEventPath = `/api/runtime/runs/${activeRun.runId}/events`

  await expect(run).toContainText('Running')
  await expect(transcript).toContainText(activeClearPrompt)
  await expectEventTypes(events, ['started'])
  await expect(runLog.locator('pre')).toContainText(activeRun.runId)
  await expect(run.getByRole('button', { name: 'Cancel' })).toBeEnabled()

  const clearedRunIds = await clearTerminalHistory(page, clearButton)

  expect(clearedRunIds).toEqual([terminalRun.runId])
  await expect(historyItems).toHaveCount(1)
  await expect(historyItems).toContainText(activeRun.runId)
  await expect(historyItems).toContainText('running')
  await expect(clearButton).toBeDisabled()
  await expect(run).toContainText('Running')
  await expect(transcript).toContainText(activeClearPrompt)
  await expectEventTypes(events, ['started'])
  await expect(runLog.locator('pre')).toContainText(activeRun.runId)
  await expect(run.getByRole('button', { name: 'Cancel' })).toBeEnabled()
  expect(eventStreamRequests.count(activeEventPath)).toBe(1)

  await expectEventTypes(events, ['started', 'output_delta'])
  await expect(transcript).toContainText(
    `Fake runtime received: "${activeClearPrompt}".`,
  )
  await expectEventTypes(events, [
    'started',
    'output_delta',
    'output_delta',
    'completed',
  ])
  await expect(run).toContainText('Completed')
  await expect(transcript).toContainText(
    'This deterministic response proves the inspector can observe a run end to end.',
  )
  expect(eventStreamRequests.count(activeEventPath)).toBe(1)
  await expect(clearButton).toBeEnabled()

  expect(await clearTerminalHistory(page, clearButton)).toEqual([
    activeRun.runId,
  ])
  await expect(historyItems).toHaveCount(0)
  await expect(history.locator('.history-count')).toHaveText('0')
  await expect(clearButton).toBeDisabled()
  await expect(transcript).toContainText('No transcript yet')
  await expect(events.getByRole('listitem')).toHaveCount(0)
  await expect(runLog.locator('pre')).toHaveText('{}')
})

test('Inspector clearing a selected terminal run does not close another run\'s active SSE', async ({
  inspectorPage: page,
}) => {
  const run = page.getByRole('region', { name: 'Run', exact: true })
  const history = page.getByRole('region', { name: 'History' })
  const clearButton = history.getByRole('button', {
    name: 'Clear terminal history',
  })
  const eventStreamRequests = trackRuntimeEventStreamRequests(page)

  await run.getByLabel('Fake Scenario').selectOption('failure')
  const terminalRun = await startFakeRun(page, 'select terminal during active run')

  await expect(clearButton).toBeEnabled()

  await run.getByLabel('Fake Scenario').selectOption('normal')
  const activeRun = await startFakeRun(page, 'active SSE survives terminal selection')
  const activeEventPath = `/api/runtime/runs/${activeRun.runId}/events`

  await expect(run).toContainText('Running')
  await history
    .locator('.history-item')
    .filter({ hasText: terminalRun.runId })
    .click()
  await expect(run).toContainText('Failed')

  const activeTerminalResponse = waitForRunLogResponse(page, {
    runId: activeRun.runId,
  })

  expect(await clearTerminalHistory(page, clearButton)).toEqual([
    terminalRun.runId,
  ])
  expect(eventStreamRequests.count(activeEventPath)).toBe(1)

  const activeTerminalLog = await readRunLog(await activeTerminalResponse)

  expect(activeTerminalLog.status).toBe('completed')
  expect(activeTerminalLog.output).toContain(
    'This deterministic response proves the inspector can observe a run end to end.',
  )
  expect(eventStreamRequests.count(activeEventPath)).toBe(1)
})

test('Inspector restores completed output, events, and debug evidence after server restart', async ({
  inspectorHarness,
  inspectorPage: page,
}) => {
  const transcript = page.getByRole('region', { name: 'Transcript' })
  const events = page.getByRole('region', { name: 'Events' })
  const runLog = page.getByRole('region', { name: 'Run Log' })
  const history = page.getByRole('region', { name: 'History' })

  await expect(page.getByText('API connected', { exact: true })).toBeVisible()

  const completedLogResponse = waitForRunLogResponse(page, {
    prompt: restartPrompt,
  })
  const completedRun = await startFakeRun(page, restartPrompt)

  await expectEventTypes(events, ['started', 'output_delta'])
  await expectEventTypes(events, [
    'started',
    'output_delta',
    'output_delta',
    'completed',
  ])

  const completedLog = await readRunLog(await completedLogResponse)

  expect(completedLog.runId).toBe(completedRun.runId)
  expect(completedLog.status).toBe('completed')
  expect(completedLog.debugLog).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source: 'fake-runtime',
        kind: 'run_started',
        message: 'Fake runtime accepted a run',
      }),
    ]),
  )

  const processRestart = await inspectorHarness.restartApiServer(
    completedRun.runId,
  )

  expect(processRestart.currentProcessId).not.toBe(
    processRestart.previousProcessId,
  )
  expect(processRestart.canonicalRunLogAtReadiness).toEqual(completedLog)

  const restoredHistoryResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/runtime/runs',
  )

  await page.reload()

  expect((await restoredHistoryResponse).status()).toBe(200)
  await expect(page.getByText('API connected', { exact: true })).toBeVisible()

  const restoredHistoryItem = history
    .locator('.history-item')
    .filter({ hasText: completedRun.runId })

  await expect(restoredHistoryItem).toHaveCount(1)
  await expect(restoredHistoryItem).toContainText('completed')

  const restoredLogResponse = waitForRunLogResponse(page, {
    runId: completedRun.runId,
  })
  await restoredHistoryItem.click()
  const restoredLog = await readRunLog(await restoredLogResponse)

  expect(restoredLog.output).toBe(completedLog.output)
  expect(restoredLog.events).toEqual(completedLog.events)
  expect(restoredLog.debugLog).toEqual(completedLog.debugLog)
  expect(restoredLog).toEqual(completedLog)
  await expect(transcript).toContainText(restartPrompt)
  await expect(transcript).toContainText(
    'This deterministic response proves the inspector can observe a run end to end.',
  )
  await expectEventTypes(events, [
    'started',
    'output_delta',
    'output_delta',
    'completed',
  ])
  await expect(runLog.locator('pre')).toHaveText(
    JSON.stringify(restoredLog, null, 2),
  )
})

test('Inspector recovers checkpointed streaming evidence after server restart', async ({
  inspectorHarness,
  inspectorPage: page,
}) => {
  const run = page.getByRole('region', { name: 'Run', exact: true })
  const transcript = page.getByRole('region', { name: 'Transcript' })
  const events = page.getByRole('region', { name: 'Events' })
  const runLog = page.getByRole('region', { name: 'Run Log' })
  const history = page.getByRole('region', { name: 'History' })
  const firstOutput = `Fake runtime received: "${interruptedPrompt}".\n`

  await expect(page.getByText('API connected', { exact: true })).toBeVisible()

  const interruptedRun = await startFakeRun(page, interruptedPrompt)

  await expectEventTypes(events, ['started', 'output_delta'])
  await expect(run).toContainText('Running')
  await expect(transcript).toContainText(firstOutput.trim())

  await expect
    .poll(async () => {
      const checkpoint = await inspectorHarness.readCanonicalRunLog(
        interruptedRun.runId,
      )

      return {
        debugKinds: checkpoint.debugLog?.map((entry) => entry.kind),
        eventTypes: checkpoint.events.map((event) => event.type),
        output: checkpoint.output,
        status: checkpoint.status,
      }
    })
    .toEqual({
      debugKinds: ['run_started'],
      eventTypes: ['started', 'output_delta'],
      output: firstOutput,
      status: 'running',
    })

  const checkpointedLog = await inspectorHarness.readCanonicalRunLog(
    interruptedRun.runId,
  )

  expect(checkpointedLog.debugLog).toEqual([
    expect.objectContaining({
      source: 'fake-runtime',
      kind: 'run_started',
      message: 'Fake runtime accepted a run',
      data: {
        prompt: interruptedPrompt,
        runId: interruptedRun.runId,
      },
    }),
  ])

  const processRestart = await inspectorHarness.restartApiServer(
    interruptedRun.runId,
  )
  const recoveredAtReadiness = processRestart.canonicalRunLogAtReadiness

  expect(processRestart.currentProcessId).not.toBe(
    processRestart.previousProcessId,
  )
  expect(recoveredAtReadiness.status).toBe('failed')
  expect(recoveredAtReadiness.error).toBe(restartRecoveryError)
  expect(recoveredAtReadiness.output).toBe(firstOutput)
  expect(recoveredAtReadiness.events.slice(0, -1)).toEqual(
    checkpointedLog.events,
  )
  expect(recoveredAtReadiness.events.at(-1)).toEqual(
    expect.objectContaining({
      type: 'failed',
      sequence: checkpointedLog.events.length + 1,
      error: restartRecoveryError,
    }),
  )
  expect(recoveredAtReadiness.debugLog?.slice(0, -1)).toEqual(
    checkpointedLog.debugLog,
  )
  expect(recoveredAtReadiness.debugLog?.at(-1)).toEqual(
    expect.objectContaining({
      source: 'kernel',
      kind: 'restart_recovery',
      message: restartRecoveryError,
      data: {
        previousStatus: 'running',
        recoveryReason: restartRecoveryError,
      },
    }),
  )

  const restoredHistoryResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/runtime/runs',
  )

  await page.reload()

  expect((await restoredHistoryResponse).status()).toBe(200)
  await expect(page.getByText('API connected', { exact: true })).toBeVisible()

  const historyItems = history.locator('.history-item')
  const recoveredHistoryItem = historyItems.filter({
    hasText: interruptedRun.runId,
  })

  await expect(recoveredHistoryItem).toHaveCount(1)
  await expect(recoveredHistoryItem).toContainText('failed')
  await expect(recoveredHistoryItem).toContainText(restartRecoveryError)
  await expect(
    historyItems.filter({ hasText: /\b(?:running|cancelling)\b/ }),
  ).toHaveCount(0)

  const restoredLogResponse = waitForRunLogResponse(page, {
    runId: interruptedRun.runId,
  })
  await recoveredHistoryItem.click()
  const restoredLog = await readRunLog(await restoredLogResponse)

  expect(restoredLog).toEqual(recoveredAtReadiness)
  await expect(run).toContainText('Failed')
  await expect(transcript).toContainText(firstOutput.trim())
  await expectEventTypes(events, ['started', 'output_delta', 'failed'])
  await expect(events.getByRole('listitem').last()).toContainText(
    `#${checkpointedLog.events.length + 1}`,
  )
  await expect(events.getByRole('listitem').last()).toContainText(
    restartRecoveryError,
  )
  await expect(runLog.locator('pre')).toHaveText(
    JSON.stringify(restoredLog, null, 2),
  )
  await expect(runLog.locator('pre')).toContainText('run_started')
  await expect(runLog.locator('pre')).toContainText('restart_recovery')
})

async function startFakeRun(
  page: Page,
  prompt: string,
): Promise<{ runId: string }> {
  const startResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/runtime/runs',
  )
  const eventStreamResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname.endsWith('/events'),
  )
  const run = page.getByRole('region', { name: 'Run', exact: true })

  await run.getByLabel('Prompt').fill(prompt)
  await run.getByRole('button', { name: 'Start Run' }).click()

  const startResponse = await startResponsePromise
  const eventStreamResponse = await eventStreamResponsePromise
  const startedRun = (await startResponse.json()) as { runId: string }

  expect(startResponse.status()).toBe(201)
  expect(await eventStreamResponse.headerValue('content-type')).toContain(
    'text/event-stream',
  )

  return startedRun
}

function waitForRunLogResponse(
  page: Page,
  match: RunLogResponseMatch,
): Promise<Response> {
  return page.waitForResponse(async (response) => {
    const pathname = new URL(response.url()).pathname

    if (response.request().method() !== 'GET') {
      return false
    }

    if ('runId' in match) {
      return pathname === `/api/runtime/runs/${match.runId}`
    }

    if (!/^\/api\/runtime\/runs\/[^/]+$/.test(pathname)) {
      return false
    }

    const body = (await response.json()) as { run: RuntimeRunLog }

    return body.run.prompt === match.prompt
  })
}

async function readRunLog(response: Response): Promise<RuntimeRunLog> {
  expect(response.status()).toBe(200)

  const body = (await response.json()) as { run: RuntimeRunLog }

  return body.run
}

async function clearTerminalHistory(
  page: Page,
  clearButton: Locator,
): Promise<string[]> {
  const clearResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      new URL(response.url()).pathname === '/api/runtime/runs',
  )
  const refreshedHistoryPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/runtime/runs',
  )

  await clearButton.click()

  const clearResponse = await clearResponsePromise
  const refreshedHistoryResponse = await refreshedHistoryPromise

  expect(clearResponse.status()).toBe(200)
  expect(refreshedHistoryResponse.status()).toBe(200)

  const body = (await clearResponse.json()) as { clearedRunIds: string[] }

  return body.clearedRunIds
}

async function expectLocatorsNotToOverlap(
  first: Locator,
  second: Locator,
): Promise<void> {
  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()

  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()

  if (!firstBox || !secondBox) {
    return
  }

  expect(
    firstBox.x + firstBox.width <= secondBox.x ||
      secondBox.x + secondBox.width <= firstBox.x ||
      firstBox.y + firstBox.height <= secondBox.y ||
      secondBox.y + secondBox.height <= firstBox.y,
  ).toBe(true)
}

function trackRuntimeEventStreamRequests(page: Page): {
  count: (pathname: string) => number
} {
  const pathnames: string[] = []

  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname

    if (request.method() === 'GET' && pathname.endsWith('/events')) {
      pathnames.push(pathname)
    }
  })

  return {
    count: (pathname) =>
      pathnames.filter((candidate) => candidate === pathname).length,
  }
}

async function expectEventTypes(
  eventsRegion: Locator,
  expectedTypes: string[],
): Promise<void> {
  const eventItems = eventsRegion.getByRole('listitem')

  await expect(eventItems).toHaveCount(expectedTypes.length)

  for (const [index, eventType] of expectedTypes.entries()) {
    await expect(eventItems.nth(index)).toContainText(eventType)
  }
}
