import { expect, type Locator, type Page, type Response } from 'playwright/test'
import type { RuntimeRunLog } from '@ay-ple/runtime-core'
import { test } from './inspector-harness.js'

const deterministicFailure = 'Fake runtime deterministic failure requested'
const streamingPrompt = 'stream this prompt'
const cancellationPrompt = 'cancel this prompt'
const failurePrompt = 'fail this prompt'

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

  const historyItems = history.getByRole('button')

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
