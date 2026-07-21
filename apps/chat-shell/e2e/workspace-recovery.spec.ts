import { createHash } from 'node:crypto'
import { access } from 'node:fs/promises'

import { expect } from 'playwright/test'

import {
  invalidWorkspaceStoreBytes,
  selectCanonicalMaterials,
  sourceConflictMaterialBytes,
  startChatShellHarness,
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

type BootstrapView = {
  readonly history: {
    readonly modelingRuns: readonly unknown[]
    readonly statePatches: readonly unknown[]
    readonly userConfirmations: readonly unknown[]
  }
  readonly workspace:
    | null
    | {
        readonly state: 'ready'
        readonly recovery: null | { readonly state: string }
        readonly materials: readonly {
          readonly digest: string
          readonly relativePath: string
        }[]
      }
    | { readonly state: 'incompatible'; readonly readOnly: true }
}

async function readProductBootstrap(page: import('playwright/test').Page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/product/bootstrap')
    if (!response.ok) throw new Error('Product bootstrap failed.')
    return response.json() as Promise<BootstrapView>
  })
}

function readyMaterial(bootstrap: BootstrapView, relativePath: string) {
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
