import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  AdmittedSemesterWorkspace,
} from '@ay-ple/semester-workspace'

import {
  createReadyWorkspacePresenter,
} from './ready-workspace-presentation.js'

test('presenter replaces user home with a slash-free breadcrumb', () => {
  const present = createReadyWorkspacePresenter({
    userHome: '/Users/private-user',
  })

  const result = present(
    workspace('/Users/private-user/Documents/2026-2학기'),
  )

  assert.deepEqual(result, {
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: 'Home › Documents › 2026-2학기',
  })
  assertSafe(result)
})

test('presenter hides parents outside trusted home and private canary segments inside it', () => {
  const present = createReadyWorkspacePresenter({
    userHome: '/Users/private-user',
  })
  const outside = present(
    workspace(
      `/Volumes/setup_secret/${'a'.repeat(64)}/2026-2학기`,
    ),
  )
  const inside = present(
    workspace(
      '/Users/private-user/workspace_deadbeef/release_preview/2026-2학기',
    ),
  )

  assert.deepEqual(outside, {
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: '선택한 위치 › 2026-2학기',
  })
  assert.deepEqual(inside, {
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: 'Home › … › … › 2026-2학기',
  })
  assertSafe(outside)
  assertSafe(inside)
})

test('presenter redacts the trusted home leaf if it recurs below home', () => {
  const present = createReadyWorkspacePresenter({
    userHome: '/Users/private-user',
  })

  const result = present(
    workspace(
      '/Users/private-user/private-user/Documents/2026-2학기',
    ),
  )

  assert.deepEqual(result, {
    semesterLabel: '2학년 2학기',
    workspaceName: '2026-2학기',
    safeDisplayLocation: 'Home › … › Documents › 2026-2학기',
  })
  assertSafe(result)
})

test('presenter replaces a username or private canary leaf only in Browser copy', () => {
  const present = createReadyWorkspacePresenter({
    userHome: '/Users/private-user',
  })

  for (const leaf of [
    'Private-User',
    'workspace_deadbeef',
    'a'.repeat(64),
    'semester\nprivate',
  ]) {
    const result = present(
      workspace(`/Users/private-user/Documents/${leaf}`),
    )

    assert.deepEqual(result, {
      semesterLabel: '2학년 2학기',
      workspaceName: '학기 공간',
      safeDisplayLocation: 'Home › Documents › 학기 공간',
    })
    assertSafe(result)
  }
})

test('presenter canonicalizes known terms and redacts private custom term text', () => {
  const present = createReadyWorkspacePresenter({
    userHome: '/Users/private-user',
  })

  assert.equal(
    present(
      workspace('/Users/private-user/Documents/summer', {
        key: 'summer',
        displayName: 'private-user',
      }),
    ).semesterLabel,
    '2학년 여름 계절학기',
  )
  const custom = present(
    workspace('/Users/private-user/Documents/custom', {
      key: 'exchange',
      displayName: 'private-user',
    }),
  )
  const digest = present(
    workspace('/Users/private-user/Documents/digest', {
      key: 'intensive',
      displayName: `setup_private_${'a'.repeat(64)}`,
    }),
  )

  assert.equal(custom.semesterLabel, '2학년 기타 학기')
  assert.equal(digest.semesterLabel, '2학년 기타 학기')
  assertSafe(custom)
  assertSafe(digest)
})

test('presenter rejects noncanonical roots and user homes', () => {
  const present = createReadyWorkspacePresenter({
    userHome: '/Users/private-user',
  })

  assert.throws(
    () => present(workspace('/Users/private-user/Documents/..')),
    /safe workspace leaf/,
  )
  assert.throws(
    () =>
      createReadyWorkspacePresenter({
        userHome: '/Users/private-user/..',
      }),
    /safe user home/,
  )
})

function workspace(
  canonicalRoot: string,
  term = { key: '2', displayName: '2학기' },
): AdmittedSemesterWorkspace {
  const workspaceId = `workspace_${'1'.repeat(32)}`
  return {
    canonicalRoot,
    workspaceId,
    formatVersion: 3,
    manifest: {
      workspaceId,
      semester: {
        yearLevel: 2,
        term,
      },
      courses: [],
    },
  }
}

function assertSafe(value: {
  readonly semesterLabel: string
  readonly workspaceName: string
  readonly safeDisplayLocation: string
}): void {
  const serialized = JSON.stringify(value)
  for (const canary of [
    '/Users/private-user',
    '/Volumes/setup_secret',
    'private-user',
    'workspace_deadbeef',
    'release_preview',
    'setup_secret',
    'workspace_11111111111111111111111111111111',
    'setup_transaction_private',
    'release_private',
    'a'.repeat(64),
    '/',
    '\\',
    '\n',
  ]) {
    assert.equal(serialized.includes(canary), false, canary)
  }
}
