import assert from 'node:assert/strict'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createSemesterWorkspaceAdmission,
  createSemesterWorkspaceAdmissionForTesting,
} from './admission.js'
import type {
  AuthorityBoundWorkspacePlan,
  WorkspaceParentAuthority,
} from './contract.js'

test('discard removes only a marker-authorized pre-admission scaffold', async () => {
  const fixture = await createDiscardFixture('safe-discard')
  try {
    await leaveOwnedIncomplete(fixture, 'after_state_temp_file_sync')
    const admission = createSemesterWorkspaceAdmission()
    const inspection = await admission.inspect({
      kind: 'discard_owned',
      setupId: fixture.createPlan.planId,
      canonicalRoot: fixture.createPlan.canonicalRoot,
    })
    assert.equal(inspection.outcome, 'owned_incomplete')
    if (inspection.outcome !== 'owned_incomplete') {
      assert.fail('discard plan required')
    }

    assert.deepEqual(await admission.apply(inspection.plan), {
      outcome: 'discarded',
    })
    await assert.rejects(
      lstat(fixture.createPlan.canonicalRoot),
      (error: NodeJS.ErrnoException) => error.code === 'ENOENT',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('discard preserves unknown and modified bytes and never removes an admitted workspace', async () => {
  for (const drift of ['unknown', 'modified'] as const) {
    const fixture = await createDiscardFixture(`preserve-${drift}`)
    try {
      await leaveOwnedIncomplete(fixture, 'after_state_temp_file_sync')
      const productRoot = path.join(
        fixture.createPlan.canonicalRoot,
        '.ay-ple',
      )
      const driftPath =
        drift === 'unknown'
          ? path.join(fixture.createPlan.canonicalRoot, 'student.txt')
          : path.join(productRoot, '.workspace-admission.json')
      if (drift === 'unknown') {
        await writeFile(driftPath, 'student-owned\n', { mode: 0o600 })
      } else {
        await writeFile(driftPath, 'modified\n')
      }
      const before = await readFile(driftPath)
      const admission = createSemesterWorkspaceAdmission()

      assert.deepEqual(
        await admission.inspect({
          kind: 'discard_owned',
          setupId: fixture.createPlan.planId,
          canonicalRoot: fixture.createPlan.canonicalRoot,
        }),
        { outcome: 'collision', readOnly: false },
      )
      assert.deepEqual(await readFile(driftPath), before)
    } finally {
      await fixture.cleanup()
    }
  }

  const fixture = await createDiscardFixture('admitted')
  try {
    const result = await fixture.admission.apply(fixture.createPlan)
    assert.equal(result.outcome, 'created')
    const statePath = path.join(
      fixture.createPlan.canonicalRoot,
      '.ay-ple',
      'workspace-state.json',
    )
    const before = await readFile(statePath)

    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'discard_owned',
        setupId: fixture.createPlan.planId,
        canonicalRoot: fixture.createPlan.canonicalRoot,
      }),
      { outcome: 'collision', readOnly: false },
    )
    assert.deepEqual(await readFile(statePath), before)
  } finally {
    await fixture.cleanup()
  }
})

async function leaveOwnedIncomplete(
  fixture: Awaited<ReturnType<typeof createDiscardFixture>>,
  failAt: string,
): Promise<void> {
  const faulting = createSemesterWorkspaceAdmissionForTesting({
    fault(point) {
      if (point === failAt) throw new Error(`fault:${point}`)
    },
  })
  const restored = await faulting.restore(fixture.description)
  assert.ok(restored)
  await assert.rejects(
    faulting.apply(restored),
    new RegExp(`fault:${failAt}`),
  )
}

async function createDiscardFixture(name: string): Promise<{
  readonly root: string
  readonly admission: ReturnType<typeof createSemesterWorkspaceAdmission>
  readonly createPlan: AuthorityBoundWorkspacePlan
  readonly description: NonNullable<
    ReturnType<
      ReturnType<
        typeof createSemesterWorkspaceAdmission
      >['describe']
    >
  >
  cleanup(): Promise<void>
}> {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), `ay-ple-discard-${name}-`)),
  )
  const parent = path.join(root, 'parent')
  await mkdir(parent, { mode: 0o700 })
  const canonicalParent = await realpath(parent)
  const stats = await lstat(canonicalParent, { bigint: true })
  const authority: WorkspaceParentAuthority = {
    selectionId: `selection_${name}`,
    canonicalParent,
    parentDevice: stats.dev.toString(),
    parentInode: stats.ino.toString(),
  }
  const admission = createSemesterWorkspaceAdmission()
  const inspection = await admission.inspect({
    kind: 'create',
    parent: authority,
    semester: {
      yearLevel: 2,
      term: { key: '2', displayName: '2학기' },
    },
    leafName: '2026-2학기',
  })
  assert.equal(inspection.outcome, 'new_target')
  if (inspection.outcome !== 'new_target') assert.fail('plan required')
  const description = admission.describe(inspection.plan)
  assert.ok(description)
  if (!description) assert.fail('description required')
  return {
    root,
    admission,
    createPlan: inspection.plan,
    description,
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}
