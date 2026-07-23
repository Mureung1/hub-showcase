import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createSemesterWorkspaceAdmission,
  createSemesterWorkspaceAdmissionForTesting,
} from './admission.js'
import type { WorkspaceParentAuthority } from './contract.js'

const recoverableFaults = [
  'after_marker_write',
  'after_marker_file_sync',
  'after_marker_directory_sync',
  'after_inbox_directory_create',
  'after_courses_directory_create',
  'after_required_directories',
  'after_state_temp_create',
  'after_state_temp_write',
  'after_state_temp_file_sync',
  'before_state_publish',
  'after_state_publish',
  'after_state_directory_sync',
  'after_state_temp_unlink',
  'after_state_temp_unlink_directory_sync',
  'before_state_readback',
  'after_state_readback',
  'before_evidence_unlink',
] as const

test('every durable create boundary leaves evidence-backed owned incomplete state that resumes to admitted', async () => {
  for (const failAt of recoverableFaults) {
    const fixture = await createPlanFixture(`fault-${failAt}`)
    let armed = true
    const faulting = createSemesterWorkspaceAdmissionForTesting({
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

test('marker-authorized resume repairs only a truncated prefix of its app-owned temporary state', async () => {
  const fixture = await createPlanFixture('truncated-owned-temp')
  const admission = createSemesterWorkspaceAdmissionForTesting({
    fault(point) {
      if (point === 'after_state_temp_write') {
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
      /fault:after_state_temp_write/,
    )
    const temporaryPath = await findTemporaryStatePath(
      inspected.plan.canonicalRoot,
    )
    const completeBytes = await readFile(temporaryPath)
    const partialBytes = completeBytes.subarray(
      0,
      Math.floor(completeBytes.byteLength / 2),
    )
    await writeFile(temporaryPath, partialBytes)

    const recovering = createSemesterWorkspaceAdmission()
    const recovery = await recovering.inspect({
      kind: 'resume_owned',
      setupId: inspected.plan.planId,
      canonicalRoot: inspected.plan.canonicalRoot,
    })
    assert.equal(recovery.outcome, 'owned_incomplete')
    if (recovery.outcome !== 'owned_incomplete') {
      assert.fail('truncated owned temp must issue a resume plan')
    }
    assert.equal((await readFile(temporaryPath)).equals(partialBytes), true)

    assert.equal((await recovering.apply(recovery.plan)).outcome, 'resumed')
    assert.equal(
      (
        await readFile(
          path.join(
            inspected.plan.canonicalRoot,
            '.ay-ple',
            'workspace-state.json',
          ),
        )
      ).equals(completeBytes),
      true,
    )
    await assert.rejects(lstat(temporaryPath), { code: 'ENOENT' })
  } finally {
    await fixture.cleanup()
  }
})

test('marker authorization never repairs non-prefix or symlink temporary bytes', async () => {
  for (const candidate of ['non_prefix', 'symlink'] as const) {
    const fixture = await createPlanFixture(`unknown-temp-${candidate}`)
    const admission = createSemesterWorkspaceAdmissionForTesting({
      fault(point) {
        if (point === 'after_state_temp_write') {
          throw new Error(`fault:${point}`)
        }
      },
    })
    const inspected = await admission.inspect(fixture.intent)
    assert.equal(inspected.outcome, 'new_target', candidate)
    if (inspected.outcome !== 'new_target') assert.fail('plan required')

    try {
      await assert.rejects(
        admission.apply(inspected.plan),
        /fault:after_state_temp_write/,
      )
      const temporaryPath = await findTemporaryStatePath(
        inspected.plan.canonicalRoot,
      )
      const sentinel = Buffer.from(`unknown-${candidate}-bytes`, 'utf8')
      const preservedPath =
        candidate === 'non_prefix'
          ? temporaryPath
          : path.join(
              fixture.intent.parent.canonicalParent,
              `${candidate}-target.bin`,
            )
      if (candidate === 'non_prefix') {
        await writeFile(temporaryPath, sentinel)
      } else {
        await writeFile(preservedPath, sentinel)
        await rm(temporaryPath)
        await symlink(preservedPath, temporaryPath)
      }

      assert.deepEqual(
        await createSemesterWorkspaceAdmission().inspect({
          kind: 'resume_owned',
          setupId: inspected.plan.planId,
          canonicalRoot: inspected.plan.canonicalRoot,
        }),
        { outcome: 'collision', readOnly: false },
        candidate,
      )
      assert.equal(
        (await readFile(preservedPath)).equals(sentinel),
        true,
        candidate,
      )
    } finally {
      await fixture.cleanup()
    }
  }
})

test('resume file-syncs a dirty complete temporary state before no-clobber publish', async () => {
  const fixture = await createPlanFixture('dirty-complete-temp')
  const admission = createSemesterWorkspaceAdmissionForTesting({
    fault(point) {
      if (point === 'after_state_temp_write') {
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
      /fault:after_state_temp_write/,
    )
    const temporaryPath = await findTemporaryStatePath(
      inspected.plan.canonicalRoot,
    )
    const completeBytes = await readFile(temporaryPath)
    const ordering: string[] = []
    const recovering = createSemesterWorkspaceAdmissionForTesting({
      fault(point) {
        if (
          point === 'after_state_temp_file_sync' ||
          point === 'before_state_publish'
        ) {
          ordering.push(point)
        }
      },
    })
    const recovery = await recovering.inspect({
      kind: 'resume_owned',
      setupId: inspected.plan.planId,
      canonicalRoot: inspected.plan.canonicalRoot,
    })
    assert.equal(recovery.outcome, 'owned_incomplete')
    if (recovery.outcome !== 'owned_incomplete') {
      assert.fail('dirty complete temp must issue a resume plan')
    }

    assert.equal((await recovering.apply(recovery.plan)).outcome, 'resumed')
    assert.deepEqual(ordering, [
      'after_state_temp_file_sync',
      'before_state_publish',
    ])
    assert.equal(
      (
        await readFile(
          path.join(
            inspected.plan.canonicalRoot,
            '.ay-ple',
            'workspace-state.json',
          ),
        )
      ).equals(completeBytes),
      true,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('faults after ownership evidence unlink leave a fully admitted workspace, never half-valid success', async () => {
  for (const failAt of [
    'after_evidence_unlink',
    'after_evidence_directory_sync',
  ] as const) {
    const fixture = await createPlanFixture(`fault-${failAt}`)
    const faulting = createSemesterWorkspaceAdmissionForTesting({
      fault(point) {
        if (point === failAt) {
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
        new RegExp(`fault:${failAt}`),
      )
      const reopened = await createSemesterWorkspaceAdmission().inspect({
        kind: 'reopen',
        canonicalRoot: inspected.plan.canonicalRoot,
      })
      assert.equal(reopened.outcome, 'admitted', failAt)
    } finally {
      await fixture.cleanup()
    }
  }
})

test('post-evidence-unlink same-shape state rewrites fail exact final byte and hash binding', async () => {
  const rewrites = [
    {
      name: 'minified bytes',
      rewrite(bytes: Buffer) {
        return Buffer.from(
          JSON.stringify(JSON.parse(bytes.toString('utf8'))),
          'utf8',
        )
      },
    },
    {
      name: 'different canonical whitespace hash',
      rewrite(bytes: Buffer) {
        return Buffer.from(
          `${JSON.stringify(JSON.parse(bytes.toString('utf8')), null, 4)}\n`,
          'utf8',
        )
      },
    },
  ] as const

  for (const rewrite of rewrites) {
    const fixture = await createPlanFixture(
      `final-bytes-${rewrite.name.replaceAll(' ', '-')}`,
    )
    let plannedBytes = Buffer.alloc(0)
    let changedBytes = Buffer.alloc(0)
    const admission = createSemesterWorkspaceAdmissionForTesting({
      async fault(point) {
        if (point !== 'after_evidence_unlink') return
        const statePath = path.join(
          fixture.intent.parent.canonicalParent,
          fixture.intent.leafName,
          '.ay-ple',
          'workspace-state.json',
        )
        plannedBytes = await readFile(statePath)
        changedBytes = rewrite.rewrite(plannedBytes)
        await writeFile(statePath, changedBytes)
      },
    })
    const inspected = await admission.inspect(fixture.intent)
    assert.equal(inspected.outcome, 'new_target', rewrite.name)
    if (inspected.outcome !== 'new_target') assert.fail('plan required')

    try {
      assert.deepEqual(
        await admission.apply(inspected.plan),
        { outcome: 'conflict' },
        rewrite.name,
      )
      assert.deepEqual(
        JSON.parse(changedBytes.toString('utf8')),
        JSON.parse(plannedBytes.toString('utf8')),
        rewrite.name,
      )
      assert.notEqual(sha256(changedBytes), sha256(plannedBytes), rewrite.name)
      assert.equal(
        (
          await readFile(
            path.join(
              inspected.plan.canonicalRoot,
              '.ay-ple',
              'workspace-state.json',
            ),
          )
        ).equals(changedBytes),
        true,
        rewrite.name,
      )
    } finally {
      await fixture.cleanup()
    }
  }
})

test('resumed apply also rejects a same-shape post-evidence-unlink rewrite', async () => {
  const fixture = await createPlanFixture('resumed-final-byte-binding')
  const admission = createSemesterWorkspaceAdmissionForTesting({
    fault(point) {
      if (point === 'before_evidence_unlink') {
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
      /fault:before_evidence_unlink/,
    )
    const statePath = path.join(
      inspected.plan.canonicalRoot,
      '.ay-ple',
      'workspace-state.json',
    )
    const plannedBytes = await readFile(statePath)
    let changedBytes = Buffer.alloc(0)
    const recovering = createSemesterWorkspaceAdmissionForTesting({
      async fault(point) {
        if (point !== 'after_evidence_unlink') return
        changedBytes = Buffer.from(
          JSON.stringify(JSON.parse(plannedBytes.toString('utf8'))),
          'utf8',
        )
        await writeFile(statePath, changedBytes)
      },
    })
    const recovery = await recovering.inspect({
      kind: 'resume_owned',
      setupId: inspected.plan.planId,
      canonicalRoot: inspected.plan.canonicalRoot,
    })
    assert.equal(recovery.outcome, 'owned_incomplete')
    if (recovery.outcome !== 'owned_incomplete') {
      assert.fail('resume plan required')
    }

    assert.deepEqual(await recovering.apply(recovery.plan), {
      outcome: 'conflict',
    })
    assert.notEqual(sha256(changedBytes), sha256(plannedBytes))
    assert.equal((await readFile(statePath)).equals(changedBytes), true)
  } finally {
    await fixture.cleanup()
  }
})

test('atomic publish refuses a raced state file and preserves every unknown byte', async () => {
  const fixture = await createPlanFixture('no-clobber')
  const sentinel = Buffer.from('student-owned race bytes', 'utf8')
  let statePath = ''
  const admission = createSemesterWorkspaceAdmissionForTesting({
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
    assert.deepEqual(recovery, {
      outcome: 'collision',
      readOnly: false,
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
  const admission = createSemesterWorkspaceAdmissionForTesting({
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
  const admission = createSemesterWorkspaceAdmissionForTesting({
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

test('root reservation and marker creation faults preserve non-resumable collisions without cleanup', async () => {
  for (const failAt of [
    'after_root_reservation',
    'after_marker_create',
  ] as const) {
    const fixture = await createPlanFixture(`collision-${failAt}`)
    const admission = createSemesterWorkspaceAdmissionForTesting({
      fault(point) {
        if (point === failAt) {
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
        new RegExp(`fault:${failAt}`),
      )
      assert.deepEqual(
        await createSemesterWorkspaceAdmission().inspect({
          kind: 'resume_owned',
          setupId: inspected.plan.planId,
          canonicalRoot: inspected.plan.canonicalRoot,
        }),
        { outcome: 'collision', readOnly: false },
        failAt,
      )
      if (failAt === 'after_root_reservation') {
        assert.deepEqual(
          await readdir(inspected.plan.canonicalRoot),
          [],
        )
      } else {
        assert.deepEqual(
          await readFile(
            path.join(
              inspected.plan.canonicalRoot,
              '.ay-ple',
              '.workspace-admission.json',
            ),
          ),
          Buffer.alloc(0),
        )
      }
    } finally {
      await fixture.cleanup()
    }
  }
})

test('parent authority is revalidated after the before-root-reservation hook', async () => {
  const fixture = await createPlanFixture('before-reserve-parent-swap')
  const displacedParent = `${fixture.intent.parent.canonicalParent}-displaced`
  let swapped = false
  const admission = createSemesterWorkspaceAdmissionForTesting({
    async fault(point) {
      if (!swapped && point === 'before_root_reservation') {
        swapped = true
        await rename(fixture.intent.parent.canonicalParent, displacedParent)
        await mkdir(fixture.intent.parent.canonicalParent)
      }
    },
  })
  const inspected = await admission.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')

  try {
    assert.deepEqual(await admission.apply(inspected.plan), {
      outcome: 'authority_changed',
    })
    await assert.rejects(lstat(inspected.plan.canonicalRoot), {
      code: 'ENOENT',
    })
    await assert.rejects(
      lstat(path.join(displacedParent, fixture.intent.leafName)),
      { code: 'ENOENT' },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a parent swap immediately after root reservation fails closed and preserves the markerless reservation', async () => {
  const fixture = await createPlanFixture('after-reserve-parent-swap')
  const displacedParent = `${fixture.intent.parent.canonicalParent}-displaced`
  let swapped = false
  const admission = createSemesterWorkspaceAdmissionForTesting({
    async fault(point) {
      if (!swapped && point === 'after_root_reservation') {
        swapped = true
        await rename(fixture.intent.parent.canonicalParent, displacedParent)
        await mkdir(fixture.intent.parent.canonicalParent)
      }
    },
  })
  const inspected = await admission.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')

  try {
    assert.deepEqual(await admission.apply(inspected.plan), {
      outcome: 'authority_changed',
    })
    await assert.rejects(lstat(inspected.plan.canonicalRoot), {
      code: 'ENOENT',
    })
    const displacedRoot = path.join(
      displacedParent,
      fixture.intent.leafName,
    )
    assert.deepEqual(await readdir(displacedRoot), [])
    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'resume_owned',
        setupId: inspected.plan.planId,
        canonicalRoot: displacedRoot,
      }),
      { outcome: 'collision', readOnly: false },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a parent swap after marker fsync fails closed and preserves the bound evidence under the displaced parent', async () => {
  const fixture = await createPlanFixture('after-marker-parent-swap')
  const displacedParent = `${fixture.intent.parent.canonicalParent}-displaced`
  let swapped = false
  const admission = createSemesterWorkspaceAdmissionForTesting({
    async fault(point) {
      if (!swapped && point === 'after_marker_file_sync') {
        swapped = true
        await rename(fixture.intent.parent.canonicalParent, displacedParent)
        await mkdir(fixture.intent.parent.canonicalParent)
      }
    },
  })
  const inspected = await admission.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')

  try {
    assert.deepEqual(await admission.apply(inspected.plan), {
      outcome: 'authority_changed',
    })
    await assert.rejects(lstat(inspected.plan.canonicalRoot), {
      code: 'ENOENT',
    })
    const displacedRoot = path.join(
      displacedParent,
      fixture.intent.leafName,
    )
    const markerBytes = await readFile(
      path.join(
        displacedRoot,
        '.ay-ple',
        '.workspace-admission.json',
      ),
    )
    assert.ok(markerBytes.byteLength > 0)
    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'resume_owned',
        setupId: inspected.plan.planId,
        canonicalRoot: displacedRoot,
      }),
      { outcome: 'collision', readOnly: false },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('owned-incomplete inspection rejects unknown recursive scaffold content and preserves every byte', async () => {
  const cases = [
    {
      name: 'inbox file',
      async add(root: string) {
        const candidate = path.join(root, 'inbox', 'student.txt')
        await writeFile(candidate, 'student inbox byte', 'utf8')
        return candidate
      },
    },
    {
      name: 'course subtree',
      async add(root: string) {
        const directory = path.join(root, 'courses', 'student-course')
        await mkdir(directory)
        const candidate = path.join(directory, 'notes.md')
        await writeFile(candidate, 'student course byte', 'utf8')
        return candidate
      },
    },
    {
      name: 'inbox symlink',
      async add(root: string) {
        const external = path.join(path.dirname(root), 'external.txt')
        await writeFile(external, 'external byte', 'utf8')
        const candidate = path.join(root, 'inbox', 'external-link')
        await symlink(external, candidate)
        return external
      },
    },
    {
      name: 'product subtree',
      async add(root: string) {
        const directory = path.join(root, '.ay-ple', 'unknown')
        await mkdir(directory)
        const candidate = path.join(directory, 'student.bin')
        await writeFile(candidate, 'student product byte', 'utf8')
        return candidate
      },
    },
  ] as const

  for (const fixtureCase of cases) {
    const fixture = await createPlanFixture(
      `unknown-${fixtureCase.name.replaceAll(' ', '-')}`,
    )
    const admission = createSemesterWorkspaceAdmissionForTesting({
      fault(point) {
        if (point === 'after_required_directories') {
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
        /fault:after_required_directories/,
      )
      const preservedPath = await fixtureCase.add(
        inspected.plan.canonicalRoot,
      )
      const before = await readFile(preservedPath)

      assert.deepEqual(
        await createSemesterWorkspaceAdmission().inspect({
          kind: 'resume_owned',
          setupId: inspected.plan.planId,
          canonicalRoot: inspected.plan.canonicalRoot,
        }),
        { outcome: 'collision', readOnly: false },
        fixtureCase.name,
      )
      assert.deepEqual(
        await readFile(preservedPath),
        before,
        fixtureCase.name,
      )
    } finally {
      await fixture.cleanup()
    }
  }
})

test('owned-incomplete apply rechecks recursive topology after issuing the resume plan', async () => {
  const fixture = await createPlanFixture('resume-topology-race')
  const admission = createSemesterWorkspaceAdmissionForTesting({
    fault(point) {
      if (point === 'after_required_directories') {
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
      /fault:after_required_directories/,
    )
    const recovering = createSemesterWorkspaceAdmission()
    const recovery = await recovering.inspect({
      kind: 'resume_owned',
      setupId: inspected.plan.planId,
      canonicalRoot: inspected.plan.canonicalRoot,
    })
    assert.equal(recovery.outcome, 'owned_incomplete')
    if (recovery.outcome !== 'owned_incomplete') {
      assert.fail('resume plan required')
    }
    const sentinel = path.join(
      inspected.plan.canonicalRoot,
      'inbox',
      'late-student-byte.txt',
    )
    await writeFile(sentinel, 'late student byte', 'utf8')

    assert.deepEqual(await recovering.apply(recovery.plan), {
      outcome: 'conflict',
    })
    assert.equal(await readFile(sentinel, 'utf8'), 'late student byte')
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

test('unknown content introduced at the final ownership boundary prevents evidence unlink and admission', async () => {
  const fixture = await createPlanFixture('final-topology-race')
  let sentinel = ''
  const admission = createSemesterWorkspaceAdmissionForTesting({
    async fault(point) {
      if (point === 'before_evidence_unlink') {
        sentinel = path.join(
          fixture.intent.parent.canonicalParent,
          fixture.intent.leafName,
          'inbox',
          'late-final-byte.txt',
        )
        await writeFile(sentinel, 'late final byte', 'utf8')
      }
    },
  })
  const inspected = await admission.inspect(fixture.intent)
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') assert.fail('plan required')

  try {
    assert.deepEqual(await admission.apply(inspected.plan), {
      outcome: 'conflict',
    })
    assert.equal(await readFile(sentinel, 'utf8'), 'late final byte')
    assert.ok(
      (
        await readFile(
          path.join(
            inspected.plan.canonicalRoot,
            '.ay-ple',
            '.workspace-admission.json',
          ),
        )
      ).byteLength > 0,
    )
    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'resume_owned',
        setupId: inspected.plan.planId,
        canonicalRoot: inspected.plan.canonicalRoot,
      }),
      { outcome: 'collision', readOnly: false },
    )
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
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-v3-admission-fault-'),
  )
  const createdParent = path.join(fixtureRoot, 'parent')
  await mkdir(createdParent)
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
    cleanup: () => rm(fixtureRoot, { force: true, recursive: true }),
  }
}

async function findTemporaryStatePath(root: string): Promise<string> {
  const productRoot = path.join(root, '.ay-ple')
  const candidates = (await readdir(productRoot)).filter(
    (entry) =>
      entry.startsWith('.workspace-state.json.') &&
      entry.endsWith('.tmp'),
  )
  assert.equal(candidates.length, 1)
  return path.join(productRoot, candidates[0]!)
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}
