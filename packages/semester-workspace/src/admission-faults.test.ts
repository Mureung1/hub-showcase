import assert from 'node:assert/strict'
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createSemesterWorkspaceAdmission,
  type WorkspaceAdmissionFaultPoint,
} from './admission.js'
import type { WorkspaceParentAuthority } from './contract.js'

const recoverableFaults = [
  'after_root_reservation',
  'after_required_directories',
  'after_state_temp_write',
  'after_state_file_sync',
  'before_state_publish',
  'after_state_publish',
  'after_state_directory_sync',
  'before_state_readback',
  'after_state_readback',
] as const satisfies readonly WorkspaceAdmissionFaultPoint[]

test('every durable create boundary leaves evidence-backed owned incomplete state that resumes to admitted', async () => {
  for (const failAt of recoverableFaults) {
    const fixture = await createPlanFixture(`fault-${failAt}`)
    let armed = true
    const faulting = createSemesterWorkspaceAdmission({
      fault(point) {
        if (armed && point === failAt) {
          armed = false
          throw new Error(`fault:${point}`)
        }
      },
    })
    const inspected = await faulting.inspect(fixture.intent)
    assert.equal(inspected.outcome, 'new_target', failAt)
    if (inspected.outcome !== 'new_target') assert.fail('plan required')

    try {
      await assert.rejects(
        faulting.apply(inspected.plan),
        new RegExp(`fault:${failAt}`),
        failAt,
      )
      const recovering = createSemesterWorkspaceAdmission()
      const recovery = await recovering.inspect({
        kind: 'resume_owned',
        setupId: inspected.plan.planId,
        canonicalRoot: inspected.plan.canonicalRoot,
      })
      assert.equal(recovery.outcome, 'owned_incomplete', failAt)
      if (recovery.outcome !== 'owned_incomplete') {
        assert.fail('durable evidence must issue a resume plan')
      }
      const resumed = await recovering.apply(recovery.plan)
      assert.equal(resumed.outcome, 'resumed', failAt)
      if (resumed.outcome !== 'resumed') {
        assert.fail('owned incomplete state must resume')
      }
      assert.deepEqual(
        await createSemesterWorkspaceAdmission().inspect({
          kind: 'reopen',
          canonicalRoot: inspected.plan.canonicalRoot,
        }),
        { outcome: 'admitted', workspace: resumed.workspace },
        failAt,
      )
      assert.deepEqual(
        await readdir(
          path.join(inspected.plan.canonicalRoot, '.ay-ple'),
        ),
        ['workspace-state.json'],
        failAt,
      )
    } finally {
      await fixture.cleanup()
    }
  }
})

test('a fault after ownership evidence removal leaves a fully admitted workspace, never half-valid success', async () => {
  const fixture = await createPlanFixture('fault-after-finalize')
  const faulting = createSemesterWorkspaceAdmission({
    fault(point) {
      if (point === 'after_evidence_removal') {
        throw new Error(`fault:${point}`)
      }
    },
  })
  const inspected = await faulting.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')

  try {
    await assert.rejects(
      faulting.apply(inspected.plan),
      /fault:after_evidence_removal/,
    )
    const reopened = await createSemesterWorkspaceAdmission().inspect({
      kind: 'reopen',
      canonicalRoot: inspected.plan.canonicalRoot,
    })
    assert.equal(reopened.outcome, 'admitted')
  } finally {
    await fixture.cleanup()
  }
})

test('atomic publish refuses a raced state file and preserves every unknown byte', async () => {
  const fixture = await createPlanFixture('no-clobber')
  const sentinel = Buffer.from('student-owned race bytes', 'utf8')
  let statePath = ''
  const admission = createSemesterWorkspaceAdmission({
    async fault(point) {
      if (point === 'before_state_publish') {
        await writeFile(statePath, sentinel, { flag: 'wx' })
      }
    },
  })
  const inspected = await admission.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')
  statePath = path.join(
    inspected.plan.canonicalRoot,
    '.ay-ple',
    'workspace-state.json',
  )

  try {
    assert.deepEqual(await admission.apply(inspected.plan), {
      outcome: 'conflict',
    })
    assert.deepEqual(await readFile(statePath), sentinel)

    const recovering = createSemesterWorkspaceAdmission()
    const recovery = await recovering.inspect({
      kind: 'resume_owned',
      setupId: inspected.plan.planId,
      canonicalRoot: inspected.plan.canonicalRoot,
    })
    assert.equal(recovery.outcome, 'owned_incomplete')
    if (recovery.outcome !== 'owned_incomplete') {
      assert.fail('ownership evidence must remain inspectable')
    }
    assert.deepEqual(await recovering.apply(recovery.plan), {
      outcome: 'conflict',
    })
    assert.deepEqual(await readFile(statePath), sentinel)
    assert.deepEqual(
      await recovering.inspect({
        kind: 'discard_owned',
        setupId: inspected.plan.planId,
        canonicalRoot: inspected.plan.canonicalRoot,
      }),
      { outcome: 'unsafe', readOnly: false },
    )
    assert.deepEqual(await readFile(statePath), sentinel)
  } finally {
    await fixture.cleanup()
  }
})

test('fresh disk readback rejects post-publish byte drift without returning admitted', async () => {
  const fixture = await createPlanFixture('readback-drift')
  const sentinel = Buffer.from('post-publish drift bytes', 'utf8')
  let statePath = ''
  const admission = createSemesterWorkspaceAdmission({
    async fault(point) {
      if (point === 'before_state_readback') {
        await writeFile(statePath, sentinel)
      }
    },
  })
  const inspected = await admission.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')
  statePath = path.join(
    inspected.plan.canonicalRoot,
    '.ay-ple',
    'workspace-state.json',
  )

  try {
    assert.deepEqual(await admission.apply(inspected.plan), {
      outcome: 'conflict',
    })
    assert.deepEqual(await readFile(statePath), sentinel)
    assert.notEqual(
      (
        await createSemesterWorkspaceAdmission().inspect({
          kind: 'reopen',
          canonicalRoot: inspected.plan.canonicalRoot,
        })
      ).outcome,
      'admitted',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a pre-reservation fault leaves no target or ownership claim', async () => {
  const fixture = await createPlanFixture('before-reserve')
  const admission = createSemesterWorkspaceAdmission({
    fault(point) {
      if (point === 'before_root_reservation') {
        throw new Error(`fault:${point}`)
      }
    },
  })
  const inspected = await admission.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')
  try {
    await assert.rejects(
      admission.apply(inspected.plan),
      /fault:before_root_reservation/,
    )
    await assert.rejects(lstat(inspected.plan.canonicalRoot), {
      code: 'ENOENT',
    })
  } finally {
    await fixture.cleanup()
  }
})

async function createPlanFixture(leafName: string): Promise<{
  readonly intent: {
    readonly kind: 'create'
    readonly parent: WorkspaceParentAuthority
    readonly semester: {
      readonly yearLevel: 4
      readonly term: {
        readonly key: 'winter'
        readonly displayName: '겨울 계절학기'
      }
    }
    readonly leafName: string
  }
  cleanup(): Promise<void>
}> {
  const createdParent = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-v3-admission-fault-'),
  )
  const canonicalParent = await realpath(createdParent)
  const stats = await lstat(canonicalParent, { bigint: true })
  return {
    intent: {
      kind: 'create',
      parent: {
        selectionId: 'parent_selection_fault',
        canonicalParent,
        parentDevice: stats.dev.toString(),
        parentInode: stats.ino.toString(),
      },
      semester: {
        yearLevel: 4,
        term: { key: 'winter', displayName: '겨울 계절학기' },
      },
      leafName,
    },
    cleanup: () => rm(canonicalParent, { force: true, recursive: true }),
  }
}
