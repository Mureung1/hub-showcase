import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  PublicPreviewAccountProjection,
  PublicPreviewCommand,
} from '@ay-ple/product-contract'
import {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
} from '@ay-ple/product-contract/testing'
import type {
  SemesterSetupJourneyProjection,
  SemesterSetupParentSelection,
  SetupJourney,
} from '@ay-ple/semester-workspace'

import type {
  AccountRuntimeRouteAdapter,
} from './account-runtime/route-adapter.js'
import {
  createPublicPreviewCommandAdapter,
} from './public-preview-command-adapter.js'
import type {
  PublicPreviewParentSelectionPort,
} from './public-preview-parent-selection.js'

test('dispatch owns a canonical prepare command before its first observation awaits', async () => {
  const observation = deferred<PublicPreviewAccountProjection>()
  const parent = selectedParent()
  const resolvedSelectionIds: string[] = []
  const guardedTargets: Array<{
    readonly canonicalParent: string
    readonly leafName: string
  }> = []
  let observationCalls = 0
  let journeyCalls = 0
  let storeMutations = 0
  let workspaceMutations = 0
  const account: AccountRuntimeRouteAdapter = {
    async observe() {
      observationCalls += 1
      return observation.promise
    },
    async refresh() {
      return PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected
    },
    async dispatch() {
      return PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected
    },
    hasPendingAttempt: () => false,
    beginShutdown() {},
  }
  const journey: SetupJourney<SemesterSetupJourneyProjection> = {
    observe: () => ({ state: 'input_required' }),
    async reconcile() {
      journeyCalls += 1
      storeMutations += 1
      workspaceMutations += 1
      return {
        outcome: 'awaiting_input',
        projection: { state: 'input_required' },
      }
    },
  }
  const parentSelection: PublicPreviewParentSelectionPort = {
    current: () => structuredClone(parent),
    async resolve(selectionId) {
      resolvedSelectionIds.push(selectionId)
      return selectionId === parent.authority.selectionId
        ? structuredClone(parent)
        : null
    },
    async select() {
      return structuredClone(parent)
    },
    beginShutdown() {},
  }
  const adapter = createPublicPreviewCommandAdapter({
    account,
    guardWorkspaceTarget(target) {
      guardedTargets.push(structuredClone(target))
      return 'blocked'
    },
    journey,
    parentSelection,
    projectionContext: {
      suggestedLeafName: '2026-2학기',
      requiredApplicationCommand: 'npx ay-ple@0.0.1',
      readyAttested: () => false,
      presentReadyWorkspace: () => ({
        semesterLabel: '2학년 2학기',
        workspaceName: '2026-2학기',
        safeDisplayLocation: 'Home › Documents › 2026-2학기',
      }),
    },
  })
  const mutableCommand: MutablePrepareCommand = {
    command: 'setup.prepare',
    input: {
      yearLevel: 2,
      term: '2',
      parentSelectionId: parent.authority.selectionId,
      leafName: '2026-2학기',
    },
  }

  const responsePromise = adapter.dispatch({
    command: mutableCommand,
    signal: new AbortController().signal,
  })
  assert.equal(observationCalls, 1)
  mutableCommand.input.parentSelectionId = 'parent_selection_mutated'
  mutableCommand.input.leafName = 'mutated-after-dispatch'
  observation.resolve(PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected)
  const response = await responsePromise

  assert.equal(response.status, 'error')
  if (response.status !== 'error') {
    assert.fail('blocked target must return an error')
  }
  assert.equal(response.error.code, 'setup_invalid_input')
  assert.deepEqual(resolvedSelectionIds, [
    parent.authority.selectionId,
  ])
  assert.deepEqual(guardedTargets, [
    {
      canonicalParent: parent.authority.canonicalParent,
      leafName: '2026-2학기',
    },
  ])
  assert.equal(journeyCalls, 0)
  assert.equal(storeMutations, 0)
  assert.equal(workspaceMutations, 0)
  assert.equal(
    JSON.stringify(response).includes(parent.authority.canonicalParent),
    false,
  )
})

type MutablePrepareCommand = {
  command: Extract<
    PublicPreviewCommand,
    { readonly command: 'setup.prepare' }
  >['command']
  input: {
    yearLevel: number
    term: string
    parentSelectionId: string
    leafName: string
  }
}

function selectedParent(): SemesterSetupParentSelection {
  return {
    authority: {
      selectionId: 'parent_selection_original',
      canonicalParent: '/private/student/Documents',
      parentDevice: '1',
      parentInode: '2',
    },
    presentation: {
      selectionId: 'parent_selection_original',
      displayName: 'Documents',
      safeDisplayLocation: 'Home › Documents',
    },
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
