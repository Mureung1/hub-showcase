import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  captureCanonicalWorkspaceBundleSource,
  createSemesterWorkspaceAdmission,
  materializeWorkspaceBundle,
  type AdmittedSemesterWorkspace,
} from '@ay-ple/semester-workspace'
import type { CodexNativeContextPort } from '@ay-ple/codex-chat-runtime'

import { createWorkspaceNativeProjectBoundary } from './native-project-boundary.js'

const skillRoot = '.agents/skills/ay-ple-first-assignment'

test('hostile ancestor and user context are excluded by the exact native boundary', async () => {
  const fixture = await createFixture()
  try {
    const journal: NativeJournalEntry[] = []
    const boundary = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: createNativeContextPort(fixture.workspace, journal),
    })

    assert.deepEqual(boundary.launch, {
      cwd: fixture.workspace.canonicalRoot,
      environment: {
        HOME: fixture.controlledHome,
        CODEX_HOME: fixture.controlledCodexHome,
      },
      configOverrides: ['project_root_markers=[]'],
    })
    assert.equal((await boundary.verify()).status, 'verified')
    assert.deepEqual(journal, [
      'readEffectiveConfig',
      'listEffectiveSkills',
    ])
    assert.equal(
      journal.filter(
        (operation) =>
          operation === 'startThread' ||
          operation === 'startTurn' ||
          operation === 'Skill',
      ).length,
      0,
    )
    assert.deepEqual(
      await readFile(path.join(fixture.hostileParent, 'AGENTS.md')),
      fixture.hostileAncestorBytes,
    )
    assert.deepEqual(
      await readFile(path.join(fixture.hostileUserHome, 'AGENTS.md')),
      fixture.hostileUserBytes,
    )
  } finally {
    await fixture.cleanup()
  }
})

const nativeMatrix = [
  {
    name: 'nonempty project root markers',
    reason: 'config_conflict',
    config: {
      projectRootMarkers: ['.git'],
      globalInstructionsFile: null,
    },
    skills: 'exact',
  },
  {
    name: 'global instructions',
    reason: 'instruction_conflict',
    config: {
      projectRootMarkers: [],
      globalInstructionsFile: '/hostile/AGENTS.md',
    },
    skills: 'exact',
  },
  {
    name: 'missing Skill',
    reason: 'skill_missing',
    config: {
      projectRootMarkers: [],
      globalInstructionsFile: null,
    },
    skills: 'missing',
  },
  {
    name: 'extra Skill',
    reason: 'skill_conflict',
    config: {
      projectRootMarkers: [],
      globalInstructionsFile: null,
    },
    skills: 'extra',
  },
  {
    name: 'wrong Skill source',
    reason: 'skill_conflict',
    config: {
      projectRootMarkers: [],
      globalInstructionsFile: null,
    },
    skills: 'wrong_source',
  },
] as const

for (const candidate of nativeMatrix) {
  test(`native project boundary blocks ${candidate.name}`, async () => {
    const fixture = await createFixture()
    try {
      const journal: NativeJournalEntry[] = []
      const boundary = createWorkspaceNativeProjectBoundary({
        workspace: fixture.workspace,
        controlledHome: fixture.controlledHome,
        controlledCodexHome: fixture.controlledCodexHome,
        nativeContext: createNativeContextPort(fixture.workspace, journal, {
          config: candidate.config,
          skills: candidate.skills,
        }),
      })

      const result = await boundary.verify()

      assert.equal(result.status, 'blocked')
      if (result.status !== 'blocked') assert.fail('expected blocked')
      assert.equal(result.reason, candidate.reason)
      assert.equal(journal.length, 2)
    } finally {
      await fixture.cleanup()
    }
  })
}

for (const failure of [
  {
    operation: 'readEffectiveConfig',
    reason: 'config_conflict',
    expectedJournal: ['readEffectiveConfig'],
  },
  {
    operation: 'listEffectiveSkills',
    reason: 'skill_conflict',
    expectedJournal: ['readEffectiveConfig', 'listEffectiveSkills'],
  },
] as const) {
  test(`${failure.operation} failure blocks effective context without native action`, async () => {
    const fixture = await createFixture()
    try {
      const journal: string[] = []
      const boundary = createWorkspaceNativeProjectBoundary({
        workspace: fixture.workspace,
        controlledHome: fixture.controlledHome,
        controlledCodexHome: fixture.controlledCodexHome,
        nativeContext: {
          async readEffectiveConfig() {
            journal.push('readEffectiveConfig')
            if (failure.operation === 'readEffectiveConfig') {
              throw new Error('injected config failure')
            }
            return {
              projectRootMarkers: [],
              globalInstructionsFile: null,
            }
          },
          async listEffectiveSkills() {
            journal.push('listEffectiveSkills')
            throw new Error('injected Skill failure')
          },
        },
      })

      const result = await boundary.verify()

      assert.deepEqual(result, {
        status: 'blocked',
        reason: failure.reason,
      })
      assert.deepEqual(journal, failure.expectedJournal)
      assert.equal(
        journal.some(
          (operation) =>
            operation === 'startThread' ||
            operation === 'startTurn' ||
            operation === 'Skill',
        ),
        false,
      )
    } finally {
      await fixture.cleanup()
    }
  })
}

test('malformed or widened high-level native context results fail closed', async () => {
  const fixture = await createFixture()
  try {
    const malformedConfig = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: {
        async readEffectiveConfig() {
          return {
            projectRootMarkers: null,
            globalInstructionsFile: null,
          } as never
        },
        async listEffectiveSkills() {
          return []
        },
      },
    })
    const malformedSkills = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: {
        async readEffectiveConfig() {
          return {
            projectRootMarkers: [],
            globalInstructionsFile: null,
          }
        },
        async listEffectiveSkills() {
          return null as never
        },
      },
    })
    const widenedConfig = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: {
        async readEffectiveConfig() {
          return {
            projectRootMarkers: [],
            globalInstructionsFile: null,
            layers: [{ private: true }],
          } as never
        },
        async listEffectiveSkills() {
          return []
        },
      },
    })
    const widenedSkills = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: {
        async readEffectiveConfig() {
          return {
            projectRootMarkers: [],
            globalInstructionsFile: null,
          }
        },
        async listEffectiveSkills() {
          return [
            {
              name: 'ay-ple-first-assignment',
              enabled: true,
              sourceRoot: path.join(
                fixture.workspace.canonicalRoot,
                skillRoot,
              ),
              scope: 'repo',
            },
          ] as never
        },
      },
    })

    assert.deepEqual(await malformedConfig.verify(), {
      status: 'blocked',
      reason: 'config_conflict',
    })
    assert.deepEqual(await malformedSkills.verify(), {
      status: 'blocked',
      reason: 'skill_conflict',
    })
    assert.deepEqual(await widenedConfig.verify(), {
      status: 'blocked',
      reason: 'config_conflict',
    })
    assert.deepEqual(await widenedSkills.verify(), {
      status: 'blocked',
      reason: 'skill_conflict',
    })
  } finally {
    await fixture.cleanup()
  }
})

for (const controlledConflict of [
  'home/AGENTS.md',
  'home/.agents/skills/canary/SKILL.md',
  'codex-home/AGENTS.override.md',
  'codex-home/skills/canary/SKILL.md',
] as const) {
  test(`controlled root conflict ${controlledConflict} is preserved and blocks before native queries`, async () => {
    const fixture = await createFixture()
    try {
      const target = path.join(fixture.root, controlledConflict)
      await mkdir(path.dirname(target), { recursive: true })
      const canary = Buffer.from(`controlled ${controlledConflict}\n`)
      await writeFile(target, canary)
      const journal: NativeJournalEntry[] = []
      const boundary = createWorkspaceNativeProjectBoundary({
        workspace: fixture.workspace,
        controlledHome: fixture.controlledHome,
        controlledCodexHome: fixture.controlledCodexHome,
        nativeContext: createNativeContextPort(fixture.workspace, journal),
      })

      const result = await boundary.verify()

      assert.equal(result.status, 'blocked')
      assert.deepEqual(await readFile(target), canary)
      assert.deepEqual(journal, [])
    } finally {
      await fixture.cleanup()
    }
  })
}

type NativeJournalEntry =
  | 'readEffectiveConfig'
  | 'listEffectiveSkills'
  | 'startThread'
  | 'startTurn'
  | 'Skill'

function createNativeContextPort(
  workspace: AdmittedSemesterWorkspace,
  journal: NativeJournalEntry[],
  override?: {
    readonly config?: {
      readonly projectRootMarkers: readonly string[]
      readonly globalInstructionsFile: string | null
    }
    readonly skills?: 'exact' | 'missing' | 'extra' | 'wrong_source'
  },
): CodexNativeContextPort {
  const exactSkill = {
    name: 'ay-ple-first-assignment',
    enabled: true,
    sourceRoot: path.join(workspace.canonicalRoot, skillRoot),
  }
  return {
    async readEffectiveConfig() {
      journal.push('readEffectiveConfig')
      return (
        override?.config ?? {
          projectRootMarkers: [],
          globalInstructionsFile: null,
        }
      )
    },
    async listEffectiveSkills() {
      journal.push('listEffectiveSkills')
      switch (override?.skills ?? 'exact') {
        case 'missing':
          return []
        case 'extra':
          return [
            exactSkill,
            {
              name: 'camp-pr',
              enabled: true,
              sourceRoot: '/ambient/.agents/skills/camp-pr',
            },
          ]
        case 'wrong_source':
          return [
            {
              ...exactSkill,
              sourceRoot: '/ambient/ay-ple-first-assignment',
            },
          ]
        case 'exact':
          return [exactSkill]
      }
    },
  }
}

async function createFixture() {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-native-boundary-test-'),
  )
  const root = await realpath(temporaryRoot)
  const hostileParent = path.join(root, 'hostile-repository')
  const hostileUserHome = path.join(root, 'hostile-user')
  const controlledHome = path.join(root, 'home')
  const controlledCodexHome = path.join(root, 'codex-home')
  const workspaceRoot = path.join(hostileParent, 'semester-workspace')
  await mkdir(path.join(hostileParent, '.git'), { recursive: true })
  await mkdir(path.join(hostileParent, '.codex'), { recursive: true })
  await mkdir(
    path.join(hostileParent, '.agents', 'skills', 'camp-pr'),
    { recursive: true },
  )
  await mkdir(path.join(hostileUserHome, '.agents', 'skills', 'user-skill'), {
    recursive: true,
  })
  await mkdir(controlledHome)
  await mkdir(controlledCodexHome)
  const hostileAncestorBytes = Buffer.from('hostile ancestor instruction\n')
  const hostileUserBytes = Buffer.from('hostile user instruction\n')
  await writeFile(
    path.join(hostileParent, 'AGENTS.md'),
    hostileAncestorBytes,
  )
  await writeFile(
    path.join(hostileUserHome, 'AGENTS.md'),
    hostileUserBytes,
  )
  const canonicalParent = await realpath(hostileParent)
  const parentStats = await stat(canonicalParent, { bigint: true })
  const admission = createSemesterWorkspaceAdmission()
  const inspected = await admission.inspect({
    kind: 'create',
    parent: {
      selectionId: 'selection_native',
      canonicalParent,
      parentDevice: String(parentStats.dev),
      parentInode: String(parentStats.ino),
    },
    semester: {
      yearLevel: 2,
      term: { key: 'spring', displayName: '1학기' },
    },
    leafName: path.basename(workspaceRoot),
  })
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') {
    assert.fail('expected native workspace target')
  }
  const applied = await admission.apply(inspected.plan)
  assert.equal(applied.outcome, 'created')
  if (applied.outcome !== 'created') {
    assert.fail('expected admitted native workspace')
  }
  const workspace = applied.workspace
  const source = await captureCanonicalWorkspaceBundleSource()
  assert.equal(
    (await materializeWorkspaceBundle({ workspace, source })).status,
    'verified',
  )
  return {
    root,
    hostileParent,
    hostileUserHome,
    controlledHome: await realpath(controlledHome),
    controlledCodexHome: await realpath(controlledCodexHome),
    hostileAncestorBytes,
    hostileUserBytes,
    workspace,
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}
