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

import { createSemesterWorkspaceAdmission } from './admission.js'
import {
  captureCanonicalWorkspaceBundleSource,
  materializeWorkspaceBundle,
  verifyWorkspaceBundle,
} from './workspace-bundle.js'
import {
  createWorkspaceContextGuard,
  verifyWorkspaceStaticContext,
} from './workspace-context.js'

const skillRoot = '.agents/skills/ay-ple-first-assignment'

test('native context guard accepts only the fixed empty-marker one-Skill roster', async () => {
  const fixture = await createFixture()
  try {
    const guard = createWorkspaceContextGuard()
    assert.deepEqual(
      guard.verify({
        workspace: fixture.workspace,
        native: {
          projectRootMarkers: [],
          globalInstructionsFile: null,
          skills: [
            {
              name: 'ay-ple-first-assignment',
              enabled: true,
              sourceRoot: path.join(
                fixture.workspace.canonicalRoot,
                skillRoot,
              ),
            },
          ],
        },
      }),
      { status: 'verified' },
    )
  } finally {
    await fixture.cleanup()
  }
})

const nativeConflictMatrix = [
  {
    name: 'project root marker',
    expected: 'config_conflict',
    snapshot: {
      projectRootMarkers: ['.git'],
      globalInstructionsFile: null,
      skills: [],
    },
  },
  {
    name: 'global instruction',
    expected: 'instruction_conflict',
    snapshot: {
      projectRootMarkers: [],
      globalInstructionsFile: '/hostile/AGENTS.md',
      skills: [],
    },
  },
  {
    name: 'missing Skill',
    expected: 'skill_missing',
    snapshot: {
      projectRootMarkers: [],
      globalInstructionsFile: null,
      skills: [],
    },
  },
  {
    name: 'disabled Skill',
    expected: 'skill_missing',
    snapshot: {
      projectRootMarkers: [],
      globalInstructionsFile: null,
      skills: [
        {
          name: 'ay-ple-first-assignment',
          enabled: false,
          sourceRoot: 'unused',
        },
      ],
    },
  },
  {
    name: 'extra Skill',
    expected: 'skill_conflict',
    snapshot: {
      projectRootMarkers: [],
      globalInstructionsFile: null,
      skills: [
        {
          name: 'ay-ple-first-assignment',
          enabled: true,
          sourceRoot: 'unused',
        },
        { name: 'camp-pr', enabled: true, sourceRoot: '/ambient/camp-pr' },
      ],
    },
  },
] as const

for (const candidate of nativeConflictMatrix) {
  test(`native context guard blocks ${candidate.name}`, async () => {
    const fixture = await createFixture()
    try {
      const result = createWorkspaceContextGuard().verify({
        workspace: fixture.workspace,
        native: candidate.snapshot,
      })
      assert.equal(result.status, 'blocked')
      if (result.status !== 'blocked') assert.fail('expected blocked')
      assert.equal(result.reason, candidate.expected)
    } finally {
      await fixture.cleanup()
    }
  })
}

for (const conflict of [
  'AGENTS.override.md',
  '.codex',
  '.agents/skills/student-skill',
] as const) {
  test(`static context blocks and preserves ${conflict}`, async () => {
    const fixture = await createFixture()
    try {
      const target = path.join(fixture.workspace.canonicalRoot, conflict)
      if (path.extname(target)) {
        await writeFile(target, `hostile ${conflict} byte\n`)
      } else {
        await mkdir(target, { recursive: true })
        await writeFile(path.join(target, 'canary.txt'), 'hostile canary\n')
      }
      const canary = path.extname(target)
        ? target
        : path.join(target, 'canary.txt')
      const before = await readFile(canary)

      const result = await verifyWorkspaceStaticContext(fixture.workspace)

      assert.equal(result.status, 'blocked')
      assert.deepEqual(await readFile(canary), before)
    } finally {
      await fixture.cleanup()
    }
  })
}

test('descriptor-outside Skill is not bundle drift but blocks static context', async () => {
  const fixture = await createFixture()
  try {
    const source = await captureCanonicalWorkspaceBundleSource()
    await materializeWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })
    const sibling = path.join(
      fixture.workspace.canonicalRoot,
      '.agents',
      'skills',
      'student-owned',
    )
    await mkdir(sibling)
    const canary = path.join(sibling, 'SKILL.md')
    await writeFile(canary, 'student-owned Skill byte\n')
    const before = await readFile(canary)

    assert.equal(
      (
        await verifyWorkspaceBundle({
          workspace: fixture.workspace,
          source,
        })
      ).status,
      'verified',
    )
    assert.deepEqual(await verifyWorkspaceStaticContext(fixture.workspace), {
      status: 'blocked',
      reason: 'skill_conflict',
    })
    assert.deepEqual(await readFile(canary), before)
  } finally {
    await fixture.cleanup()
  }
})

async function createFixture() {
  const root = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-workspace-context-test-'),
  )
  const canonicalParent = await realpath(root)
  const parentStats = await lstat(canonicalParent, { bigint: true })
  const admission = createSemesterWorkspaceAdmission()
  const inspected = await admission.inspect({
    kind: 'create',
    parent: {
      selectionId: 'selection_context',
      canonicalParent,
      parentDevice: String(parentStats.dev),
      parentInode: String(parentStats.ino),
    },
    semester: {
      yearLevel: 2,
      term: { key: 'spring', displayName: '1학기' },
    },
    leafName: 'workspace',
  })
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') {
    assert.fail('expected fresh context workspace target')
  }
  const applied = await admission.apply(inspected.plan)
  assert.equal(applied.outcome, 'created')
  if (applied.outcome !== 'created') {
    assert.fail('expected admitted context workspace')
  }
  const workspace = applied.workspace
  return {
    workspace,
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}
