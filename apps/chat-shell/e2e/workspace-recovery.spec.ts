import { createHash } from 'node:crypto'
import { access } from 'node:fs/promises'
import path from 'node:path'

import { expect } from 'playwright/test'

import type { ProductBootstrap } from '../src/product-api.js'
import {
  invalidWorkspaceStoreBytes,
  selectCanonicalMaterials,
  sourceConflictMaterialBytes,
  startChatShellHarness,
  storeConflictCourseName,
  test,
} from './chat-shell-harness.js'

const conflictedMaterialPath = 'lms-outline-notice.txt'
const workspaceStorePath = '.ay-ple/workspace-state.json'

test.describe('workspace recovery', () => {
  test.describe.configure({ mode: 'serial' })

  test.describe('registered source conflict', () => {
    test.use({ scenario: 'source-conflict' })

    test('interrupts the native Turn, preserves the changed TXT, and resumes only after explicit adoption', async ({
      chatHarness,
      chatPage: page,
    }) => {
      const materials = page.getByRole('complementary', { name: '학기 자료' })
      const action = materials.getByRole('button', {
        name: /선택한 자료 정리하기/u,
      })
      const before = await readProductBootstrap(page)
      const beforeNotice = readyMaterial(before, conflictedMaterialPath)

      await selectCanonicalMaterials(page)
      await action.click()

      const recovery = materials.getByRole('alert').filter({
        hasText: '원본 자료 변경을 확인해 주세요',
      })
      await expect(recovery).toBeVisible()
      await expect(action).toBeDisabled()
      await expect
        .poll(
          () =>
            chatHarness
              .calls()
              .filter((call) => call.operation === 'interrupt').length,
        )
        .toBe(1)
      expect(
        await chatHarness.readWorkspaceBytes(conflictedMaterialPath),
      ).toEqual(sourceConflictMaterialBytes)

      const conflicted = await readProductBootstrap(page)
      expect(conflicted.workspace?.state).toBe('ready')
      if (conflicted.workspace?.state !== 'ready') {
        throw new Error('Expected a ready recovery workspace.')
      }
      expect(conflicted.workspace.recovery?.state).toBe('source_conflict')
      expect(
        readyMaterial(conflicted, conflictedMaterialPath).digest,
      ).toBe(beforeNotice.digest)

      await recovery
        .getByRole('button', { name: '현재 TXT를 새 기준으로 채택' })
        .click()

      await expect(
        materials.getByText('현재 TXT를 새 기준으로 채택했습니다'),
      ).toBeVisible()
      await expect(recovery).toHaveCount(0)
      const adopted = await readProductBootstrap(page)
      const adoptedNotice = readyMaterial(adopted, conflictedMaterialPath)
      expect(adopted.workspace?.state).toBe('ready')
      if (adopted.workspace?.state !== 'ready') {
        throw new Error('Expected a ready adopted workspace.')
      }
      expect(adopted.workspace.recovery).toBeNull()
      expect(adoptedNotice.digest).toBe(sha256(sourceConflictMaterialBytes))
      expect(adoptedNotice.digest).not.toBe(beforeNotice.digest)
      expect(
        await chatHarness.readWorkspaceBytes(conflictedMaterialPath),
      ).toEqual(sourceConflictMaterialBytes)

      await expect(action).toBeEnabled()
      await action.click()
      await expect(
        page.getByRole('region', { name: '검토 대기' }),
      ).toBeVisible()
      expect(
        chatHarness
          .calls()
          .filter((call) => call.operation === 'startProductTurn'),
      ).toHaveLength(2)
      await page.getByRole('button', { name: '작업 중단' }).click()
      await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
    })
  })

  test.describe('invalid cold store', () => {
    test.use({ scenario: 'invalid-store' })

    test('opens read-only without rewriting bytes or starting a native Turn', async ({
      chatHarness,
      chatPage: page,
    }) => {
      const materials = page.getByRole('complementary', { name: '학기 자료' })
      const incompatible = materials.getByRole('alert').filter({
        hasText: '이 작업공간은 읽기 전용입니다',
      })

      await expect(incompatible).toBeVisible()
      const bootstrap = await readProductBootstrap(page)
      expect(bootstrap.workspace).toMatchObject({
        state: 'incompatible',
        readOnly: true,
      })
      expect(await chatHarness.readWorkspaceBytes(workspaceStorePath)).toEqual(
        invalidWorkspaceStoreBytes,
      )
      expect(
        chatHarness.calls().filter(
          (call) =>
            call.operation === 'startThread' ||
            call.operation === 'startProductTurn',
        ),
      ).toHaveLength(0)
    })
  })

  test.describe('active store conflict', () => {
    test.use({ scenario: 'store-conflict' })

    test('reactivates the current Server workspace only after operation release and reconciles the guard', async ({
      chatHarness,
      chatPage: page,
    }) => {
      const materials = page.getByRole('complementary', { name: '학기 자료' })
      const action = materials.getByRole('button', {
        name: /선택한 자료 정리하기/u,
      })

      await selectCanonicalMaterials(page)
      await action.click()

      const recovery = materials.getByRole('alert').filter({
        hasText: '작업공간 복구가 필요합니다',
      })
      await expect(recovery).toBeVisible()
      await expect(action).toBeDisabled()
      await expect
        .poll(
          () =>
            chatHarness
              .calls()
              .filter((call) => call.operation === 'interrupt').length,
        )
        .toBe(1)

      const conflicted = await readProductBootstrap(page)
      expect(conflicted.operationStatus).toBe('idle')
      expect(conflicted.workspace?.state).toBe('ready')
      if (conflicted.workspace?.state !== 'ready') {
        throw new Error('Expected a ready store-conflict workspace.')
      }
      expect(conflicted.workspace.recovery?.state).toBe('store_conflict')
      const conflictedStore = parseWorkspaceStore(
        await chatHarness.readWorkspaceBytes(workspaceStorePath),
      )
      expect(courseDisplayName(conflictedStore)).toBe(storeConflictCourseName)
      expect(executionGuard(conflictedStore)).toMatchObject({ state: 'active' })
      const guardedOperationId = guardOperationId(conflictedStore)
      const scratchPath = path.join(
        chatHarness.workspace.workspaceRoot,
        '.ay-ple',
        'runtime-scratch',
        guardedOperationId,
      )
      const stagingPath = path.join(
        chatHarness.workspace.runRoot,
        'app-data',
        'assignment-runs',
        guardedOperationId,
      )
      await Promise.all([access(scratchPath), access(stagingPath)])

      await recovery
        .getByRole('button', { name: '작업공간 다시 선택' })
        .click()

      await expect(recovery).toHaveCount(0)
      await expect(
        materials.getByText(storeConflictCourseName, { exact: true }),
      ).toBeVisible()
      const recovered = await readProductBootstrap(page)
      expect(recovered.workspace?.state).toBe('ready')
      if (recovered.workspace?.state !== 'ready') {
        throw new Error('Expected a recovered ready workspace.')
      }
      expect(recovered.workspace.course?.displayName).toBe(
        storeConflictCourseName,
      )
      expect(recovered.workspace.recovery).toBeNull()
      expect(
        executionGuard(
          parseWorkspaceStore(
            await chatHarness.readWorkspaceBytes(workspaceStorePath),
          ),
        ),
      ).toBeNull()
      await Promise.all([
        expectPathMissing(scratchPath),
        expectPathMissing(stagingPath),
      ])

      await expect(action).toBeEnabled()
      await action.click()
      await expect(
        page.getByRole('region', { name: '검토 대기' }),
      ).toBeVisible()
      expect(
        chatHarness
          .calls()
          .filter((call) => call.operation === 'startProductTurn'),
      ).toHaveLength(2)
      await page.getByRole('button', { name: '작업 중단' }).click()
      await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
    })
  })
})

test('isolates two fresh Browser-to-Server harness runs and native session identities', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const first = await startChatShellHarness('ready')
  let firstThreadId: string | undefined
  try {
    await page.goto(first.url)
    await selectCanonicalMaterials(page)
    await page
      .getByRole('button', { name: /선택한 자료 정리하기/u })
      .click()
    await expect(page.getByRole('region', { name: '검토 대기' })).toBeVisible()
    firstThreadId = startedThreadId(first)
    await page.getByRole('button', { name: '작업 중단' }).click()
    await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
    await page.goto('about:blank')
  } finally {
    await first.close()
  }
  await expectPathMissing(first.workspace.runRoot)
  if (!firstThreadId) throw new Error('Expected the first native session.')

  const second = await startChatShellHarness('ready')
  try {
    expect(second.workspace.runId).not.toBe(first.workspace.runId)
    expect(second.workspace.runRoot).not.toBe(first.workspace.runRoot)
    expect(second.workspace.workspaceRoot).not.toBe(first.workspace.workspaceRoot)
    expect(second.workspace.seedDigest).toBe(first.workspace.seedDigest)
    expect(second.calls()).toHaveLength(0)

    await page.goto(second.url)
    const bootstrap = await readProductBootstrap(page)
    expect(bootstrap.history.modelingRuns).toEqual([])
    expect(bootstrap.history.statePatches).toEqual([])
    expect(bootstrap.history.userConfirmations).toEqual([])
    await selectCanonicalMaterials(page)
    await page
      .getByRole('button', { name: /선택한 자료 정리하기/u })
      .click()
    await expect(page.getByRole('region', { name: '검토 대기' })).toBeVisible()
    expect(startedThreadId(second)).not.toBe(firstThreadId)
    await page.getByRole('button', { name: '작업 중단' }).click()
    await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
    await page.goto('about:blank')
  } finally {
    await second.close()
  }
  await expectPathMissing(second.workspace.runRoot)
})

async function readProductBootstrap(
  page: import('playwright/test').Page,
): Promise<ProductBootstrap> {
  return (await page.evaluate(async () => {
    const response = await fetch('/api/product/bootstrap')
    if (!response.ok) throw new Error('Product bootstrap failed.')
    return response.json()
  })) as ProductBootstrap
}

function readyMaterial(bootstrap: ProductBootstrap, relativePath: string) {
  if (bootstrap.workspace?.state !== 'ready') {
    throw new Error('Expected a ready workspace.')
  }
  const material = bootstrap.workspace.materials.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  if (!material) throw new Error(`Missing material: ${relativePath}`)
  return material
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function parseWorkspaceStore(bytes: Uint8Array): Record<string, unknown> {
  return JSON.parse(Buffer.from(bytes).toString('utf8')) as Record<
    string,
    unknown
  >
}

function courseDisplayName(store: Record<string, unknown>): unknown {
  const course = store.course
  return typeof course === 'object' && course !== null
    ? (course as Record<string, unknown>).displayName
    : undefined
}

function executionGuard(store: Record<string, unknown>): unknown {
  return store.executionGuard
}

function guardOperationId(store: Record<string, unknown>): string {
  const guard = executionGuard(store)
  if (typeof guard !== 'object' || guard === null) {
    throw new Error('Expected an execution guard.')
  }
  const operationId = (guard as Record<string, unknown>).operationId
  if (typeof operationId !== 'string') {
    throw new Error('Expected a guarded operation ID.')
  }
  return operationId
}

function startedThreadId(
  harness: Awaited<ReturnType<typeof startChatShellHarness>>,
): string {
  const call = harness
    .calls()
    .find((candidate) => candidate.operation === 'startProductTurn')
  if (!call || call.operation !== 'startProductTurn') {
    throw new Error('Expected a started native product Turn.')
  }
  return call.input.threadId
}

async function expectPathMissing(filePath: string): Promise<void> {
  try {
    await access(filePath)
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return
    }
    throw error
  }
  throw new Error(`Expected the path to be removed: ${filePath}`)
}
