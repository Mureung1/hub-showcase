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

test('overlapping verification callers share one atomic native context generation', async () => {
  const fixture = await createFixture()
  try {
    let releaseConfig!: () => void
    const configBlocked = new Promise<void>((resolve) => {
      releaseConfig = resolve
    })
    let configReads = 0
    let skillReads = 0
    const exactSkill = {
      name: 'ay-ple-first-assignment',
      enabled: true,
      sourceRoot: path.join(
        fixture.workspace.canonicalRoot,
        skillRoot,
      ),
    }
    const boundary = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: {
        async readEffectiveConfig() {
          configReads += 1
          await configBlocked
          return {
            projectRootMarkers: [],
            globalInstructionsFile: null,
          }
        },
        async listEffectiveSkills() {
          skillReads += 1
          return [
            exactSkill,
            {
              name: 'hostile',
              enabled: true,
              sourceRoot: '/ambient/.agents/skills/hostile',
            },
          ]
        },
      },
    })

    const first = boundary.verify()
    const second = boundary.verify()
    releaseConfig()

    assert.deepEqual(await Promise.all([first, second]), [
      { status: 'blocked', reason: 'skill_conflict' },
      { status: 'blocked', reason: 'skill_conflict' },
    ])
    assert.equal(configReads, 1)
    assert.equal(skillReads, 1)
  } finally {
    await fixture.cleanup()
  }
})

test('abort propagates to both native reads and verification settles only after both calls clean up', async () => {
  const fixture = await createFixture()
  try {
    const events: string[] = []
    let releaseConfig!: () => void
    let releaseSkills!: () => void
    const configCleanup = new Promise<void>((resolve) => {
      releaseConfig = resolve
    })
    const skillsCleanup = new Promise<void>((resolve) => {
      releaseSkills = resolve
    })
    const nativeContext: CodexNativeContextPort = {
      async readEffectiveConfig({ signal }) {
        events.push('config.started')
        await aborted(signal)
        events.push('config.aborted')
        await configCleanup
        events.push('config.cleaned')
        throw new Error('cancelled')
      },
      async listEffectiveSkills({ signal }) {
        events.push('skills.started')
        await aborted(signal)
        events.push('skills.aborted')
        await skillsCleanup
        events.push('skills.cleaned')
        throw new Error('cancelled')
      },
    }
    const boundary = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext,
    })
    const controller = new AbortController()
    let settled = false
    const verification = boundary
      .verify({ signal: controller.signal })
      .then((result) => {
        settled = true
        return result
      })
    await waitFor(() => events.length === 2)

    controller.abort()
    await waitFor(() => events.includes('skills.aborted'))
    assert.equal(settled, false)
    releaseConfig()
    await waitFor(() => events.includes('config.cleaned'))
    assert.equal(settled, false)
    releaseSkills()

    assert.deepEqual(await verification, {
      status: 'blocked',
      reason: 'config_conflict',
    })
    assert.deepEqual(events, [
      'config.started',
      'skills.started',
      'config.aborted',
      'skills.aborted',
      'config.cleaned',
      'skills.cleaned',
    ])
  } finally {
    await fixture.cleanup()
  }
})

test('separate boundaries sharing one native port cannot mix hostile generations', async () => {
  const fixture = await createFixture()
  try {
    const exactSkill = {
      name: 'ay-ple-first-assignment',
      enabled: true,
      sourceRoot: path.join(
        fixture.workspace.canonicalRoot,
        skillRoot,
      ),
    }
    const snapshots = [
      {
        config: {
          projectRootMarkers: [],
          globalInstructionsFile: null,
        },
        skills: [
          exactSkill,
          {
            name: 'hostile',
            enabled: true,
            sourceRoot: '/ambient/.agents/skills/hostile',
          },
        ],
      },
      {
        config: {
          projectRootMarkers: ['.git'],
          globalInstructionsFile: null,
        },
        skills: [exactSkill],
      },
    ] as const
    const snapshotBySignal = new WeakMap<
      AbortSignal,
      (typeof snapshots)[number]
    >()
    let configReads = 0
    let skillReads = 0
    const nativeContext: CodexNativeContextPort = {
      async readEffectiveConfig({ signal }) {
        const snapshot = snapshots[configReads]
        configReads += 1
        assert.ok(snapshot)
        snapshotBySignal.set(signal, snapshot)
        return snapshot.config
      },
      async listEffectiveSkills({ signal }) {
        skillReads += 1
        const snapshot = snapshotBySignal.get(signal)
        assert.ok(snapshot)
        return snapshot.skills
      },
    }
    const createBoundary = () =>
      createWorkspaceNativeProjectBoundary({
        workspace: fixture.workspace,
        controlledHome: fixture.controlledHome,
        controlledCodexHome: fixture.controlledCodexHome,
        nativeContext,
      })

    const results = await Promise.all([
      createBoundary().verify(),
      createBoundary().verify(),
    ])

    assert.equal(
      results.every((result) => result.status === 'blocked'),
      true,
    )
    assert.deepEqual(
      results
        .map((result) =>
          result.status === 'blocked' ? result.reason : 'verified',
        )
        .sort(),
      ['config_conflict', 'skill_conflict'],
    )
    assert.equal(configReads, 2)
    assert.equal(skillReads, 2)
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
    expectedJournal: ['readEffectiveConfig', 'listEffectiveSkills'],
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

test('official Codex system Skill cache is preserved and admitted through the effective roster', async () => {
  const fixture = await createFixture()
  try {
    const target = path.join(
      fixture.controlledCodexHome,
      'skills',
      '.system',
      'bundled',
      'SKILL.md',
    )
    await mkdir(path.dirname(target), { recursive: true })
    const bytes = Buffer.from('official system Skill cache\n')
    await writeFile(target, bytes)
    const journal: NativeJournalEntry[] = []
    const boundary = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: createNativeContextPort(fixture.workspace, journal),
    })

    assert.deepEqual(await boundary.verify(), { status: 'verified' })
    assert.deepEqual(await readFile(target), bytes)
    assert.deepEqual(journal, [
      'readEffectiveConfig',
      'listEffectiveSkills',
    ])
  } finally {
    await fixture.cleanup()
  }
})

test('legacy user Skill in controlled Codex home is preserved and blocked by the effective roster', async () => {
  const fixture = await createFixture()
  try {
    const skillRoot = path.join(
      fixture.controlledCodexHome,
      'skills',
      'canary',
    )
    const target = path.join(skillRoot, 'SKILL.md')
    await mkdir(skillRoot, { recursive: true })
    const bytes = Buffer.from('controlled Codex user Skill\n')
    await writeFile(target, bytes)
    const journal: NativeJournalEntry[] = []
    const exactSkill = {
      name: 'ay-ple-first-assignment',
      enabled: true,
      sourceRoot: path.join(
        fixture.workspace.canonicalRoot,
        '.agents',
        'skills',
        'ay-ple-first-assignment',
      ),
    }
    const boundary = createWorkspaceNativeProjectBoundary({
      workspace: fixture.workspace,
      controlledHome: fixture.controlledHome,
      controlledCodexHome: fixture.controlledCodexHome,
      nativeContext: {
        async readEffectiveConfig() {
          journal.push('readEffectiveConfig')
          return {
            projectRootMarkers: [],
            globalInstructionsFile: null,
          }
        },
        async listEffectiveSkills() {
          journal.push('listEffectiveSkills')
          return [
            exactSkill,
            {
              name: 'canary',
              enabled: true,
              sourceRoot: skillRoot,
            },
          ]
        },
      },
    })

    assert.deepEqual(await boundary.verify(), {
      status: 'blocked',
      reason: 'skill_conflict',
    })
    assert.deepEqual(await readFile(target), bytes)
    assert.deepEqual(journal, [
      'readEffectiveConfig',
      'listEffectiveSkills',
    ])
  } finally {
    await fixture.cleanup()
  }
})

type NativeJournalEntry =
  | 'readEffectiveConfig'
  | 'listEffectiveSkills'
  | 'startThread'
  | 'startTurn'
  | 'Skill'

function aborted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  assert.fail('condition was not reached')
}

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
