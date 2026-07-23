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

import {
  createWorkspaceNativeContextPort,
  createWorkspaceNativeProjectBoundary,
  type WorkspaceNativeContextQueryPort,
} from './native-project-boundary.js'
import {
  createWorkspaceActionAdmission,
  type WorkspaceActionReadinessPort,
} from './workspace-action-admission.js'

const skillRoot = '.agents/skills/ay-ple-first-assignment'

test('action admission fresh-validates v3, Ready, bundle, static and native context', async () => {
  const fixture = await createFixture()
  try {
    const gate = createGate(fixture)

    const result = await gate.admit({
      workspace: fixture.workspace,
      action: 'academic',
    })

    assert.equal(result.status, 'admitted')
    assert.equal(fixture.readinessReads, 2)
    assert.deepEqual(fixture.nativeJournal, [
      'config/read',
      'skills/list',
    ])
  } finally {
    await fixture.cleanup()
  }
})

test('action-time bundle revalidation blocks later drift without overwriting it', async () => {
  const fixture = await createFixture()
  try {
    const gate = createGate(fixture)
    assert.equal(
      (
        await gate.admit({
          workspace: fixture.workspace,
          action: 'academic',
        })
      ).status,
      'admitted',
    )
    const agentsPath = path.join(
      fixture.workspace.canonicalRoot,
      'AGENTS.md',
    )
    const studentBytes = Buffer.from('student-modified instruction\n')
    await writeFile(agentsPath, studentBytes)
    fixture.nativeJournal.length = 0

    const result = await gate.admit({
      workspace: fixture.workspace,
      action: 'academic',
    })

    assert.deepEqual(result, {
      status: 'blocked',
      reason: 'bundle_not_verified',
    })
    assert.deepEqual(await readFile(agentsPath), studentBytes)
    assert.deepEqual(fixture.nativeJournal, [])
  } finally {
    await fixture.cleanup()
  }
})

test('action-time local context revalidation blocks later undeclared Skill', async () => {
  const fixture = await createFixture()
  try {
    const gate = createGate(fixture)
    const canary = path.join(
      fixture.workspace.canonicalRoot,
      '.agents',
      'skills',
      'student-skill',
      'SKILL.md',
    )
    await mkdir(path.dirname(canary))
    await writeFile(canary, 'student Skill canary\n')

    const result = await gate.admit({
      workspace: fixture.workspace,
      action: 'academic',
    })

    assert.deepEqual(result, {
      status: 'blocked',
      reason: 'context_not_verified',
    })
  } finally {
    await fixture.cleanup()
  }
})

test('action-time native context revalidation blocks a stale effective roster', async () => {
  const fixture = await createFixture()
  try {
    const gate = createGate(fixture)
    fixture.nativeMode = 'exact'
    assert.equal(
      (
        await gate.admit({
          workspace: fixture.workspace,
          action: 'academic',
        })
      ).status,
      'admitted',
    )
    fixture.nativeMode = 'extra'

    const result = await gate.admit({
      workspace: fixture.workspace,
      action: 'academic',
    })

    assert.deepEqual(result, {
      status: 'blocked',
      reason: 'context_not_verified',
    })
  } finally {
    await fixture.cleanup()
  }
})

test('native verification failure returns a closed context result', async () => {
  const fixture = await createFixture()
  try {
    const nativeBoundary = createNativeBoundary(fixture)
    const gate = createWorkspaceActionAdmission({
      source: fixture.source,
      readiness: fixture.readiness,
      nativeBoundary: {
        ...nativeBoundary,
        async verify() {
          throw new Error('injected native boundary failure')
        },
      },
    })

    assert.deepEqual(
      await gate.admit({
        workspace: fixture.workspace,
        action: 'academic',
      }),
      {
        status: 'blocked',
        reason: 'context_not_verified',
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('bundle drift during native verification is caught by final readback', async () => {
  const fixture = await createFixture()
  try {
    const agentsPath = path.join(
      fixture.workspace.canonicalRoot,
      'AGENTS.md',
    )
    const racedBytes = Buffer.from('raced student instruction\n')
    fixture.beforeSkillsList = async () => {
      await writeFile(agentsPath, racedBytes)
    }
    const gate = createGate(fixture)

    const result = await gate.admit({
      workspace: fixture.workspace,
      action: 'academic',
    })

    assert.deepEqual(result, {
      status: 'blocked',
      reason: 'bundle_not_verified',
    })
    assert.deepEqual(await readFile(agentsPath), racedBytes)
  } finally {
    await fixture.cleanup()
  }
})

for (const readiness of [
  {
    state: 'workspace_not_ready',
    reason: 'workspace_not_ready',
  },
  {
    state: 'setup_transition_active',
    reason: 'setup_transition_active',
  },
] as const) {
  test(`${readiness.state} blocks before bundle or native work`, async () => {
    const fixture = await createFixture()
    try {
      fixture.readinessState = readiness.state
      const gate = createGate(fixture)

      const result = await gate.admit({
        workspace: fixture.workspace,
        action: 'academic',
      })

      assert.deepEqual(result, {
        status: 'blocked',
        reason: readiness.reason,
      })
      assert.deepEqual(fixture.nativeJournal, [])
    } finally {
      await fixture.cleanup()
    }
  })
}

test('unknown readiness vocabulary fails closed before native work', async () => {
  const fixture = await createFixture()
  try {
    fixture.readinessState = 'unknown' as never
    const gate = createGate(fixture)

    assert.deepEqual(
      await gate.admit({
        workspace: fixture.workspace,
        action: 'academic',
      }),
      {
        status: 'blocked',
        reason: 'workspace_not_ready',
      },
    )
    assert.deepEqual(fixture.nativeJournal, [])
  } finally {
    await fixture.cleanup()
  }
})

test('a Ready transition during verification blocks the final admission', async () => {
  const fixture = await createFixture()
  try {
    fixture.readinessSequence = ['ready', 'workspace_not_ready']
    const gate = createGate(fixture)

    const result = await gate.admit({
      workspace: fixture.workspace,
      action: 'academic',
    })

    assert.deepEqual(result, {
      status: 'blocked',
      reason: 'workspace_not_ready',
    })
    assert.equal(fixture.readinessReads, 2)
  } finally {
    await fixture.cleanup()
  }
})

test('fresh v3 revalidation blocks a stale admitted handle', async () => {
  const fixture = await createFixture()
  try {
    const replacementBytes = Buffer.from(
      '{"kind":"student replacement"}\n',
    )
    const statePath = path.join(
      fixture.workspace.canonicalRoot,
      '.ay-ple',
      'workspace-state.json',
    )
    await writeFile(
      statePath,
      replacementBytes,
    )
    const gate = createGate(fixture)

    const result = await gate.admit({
      workspace: fixture.workspace,
      action: 'academic',
    })

    assert.deepEqual(result, {
      status: 'blocked',
      reason: 'workspace_not_ready',
    })
    assert.deepEqual(fixture.nativeJournal, [])
    assert.deepEqual(await readFile(statePath), replacementBytes)
  } finally {
    await fixture.cleanup()
  }
})

function createGate(
  fixture: Awaited<ReturnType<typeof createFixture>>,
) {
  return createWorkspaceActionAdmission({
    source: fixture.source,
    readiness: fixture.readiness,
    nativeBoundary: createNativeBoundary(fixture),
  })
}

function createNativeBoundary(
  fixture: Awaited<ReturnType<typeof createFixture>>,
) {
  return createWorkspaceNativeProjectBoundary({
    workspace: fixture.workspace,
    controlledHome: fixture.controlledHome,
    controlledCodexHome: fixture.controlledCodexHome,
    nativeContext: createWorkspaceNativeContextPort({
      workspaceRoot: fixture.workspace.canonicalRoot,
      queryPort: fixture.queryPort,
    }),
  })
}

async function createFixture() {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-action-admission-test-'),
  )
  const root = await realpath(temporaryRoot)
  const parent = path.join(root, 'parent')
  const controlledHome = path.join(root, 'home')
  const controlledCodexHome = path.join(root, 'codex-home')
  await mkdir(parent)
  await mkdir(controlledHome)
  await mkdir(controlledCodexHome)
  const canonicalParent = await realpath(parent)
  const parentStats = await stat(canonicalParent, { bigint: true })
  const admission = createSemesterWorkspaceAdmission()
  const inspected = await admission.inspect({
    kind: 'create',
    parent: {
      selectionId: 'selection_action',
      canonicalParent,
      parentDevice: String(parentStats.dev),
      parentInode: String(parentStats.ino),
    },
    semester: {
      yearLevel: 2,
      term: { key: 'spring', displayName: '1학기' },
    },
    leafName: 'semester-workspace',
  })
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') {
    assert.fail('expected new workspace target')
  }
  const applied = await admission.apply(inspected.plan)
  assert.equal(applied.outcome, 'created')
  if (applied.outcome !== 'created') {
    assert.fail('expected created workspace')
  }
  const workspace = applied.workspace
  const source = await captureCanonicalWorkspaceBundleSource()
  assert.equal(
    (await materializeWorkspaceBundle({ workspace, source })).status,
    'verified',
  )

  let readinessState:
    | 'ready'
    | 'workspace_not_ready'
    | 'setup_transition_active' = 'ready'
  let readinessSequence:
    | (
        | 'ready'
        | 'workspace_not_ready'
        | 'setup_transition_active'
      )[]
    | undefined
  let readinessReads = 0
  let nativeMode: 'exact' | 'extra' = 'exact'
  let beforeSkillsList: (() => Promise<void>) | undefined
  const nativeJournal: string[] = []
  const readiness: WorkspaceActionReadinessPort = {
    async read() {
      readinessReads += 1
      return readinessSequence?.shift() ?? readinessState
    },
  }
  const queryPort: WorkspaceNativeContextQueryPort = {
    async readConfig() {
      nativeJournal.push('config/read')
      return {
        projectRootMarkers: [],
        globalInstructionsFile: null,
      }
    },
    async listSkills() {
      await beforeSkillsList?.()
      nativeJournal.push('skills/list')
      const exact = {
        name: 'ay-ple-first-assignment',
        enabled: true,
        sourceRoot: path.join(workspace.canonicalRoot, skillRoot),
      }
      return nativeMode === 'exact'
        ? [exact]
        : [
            exact,
            {
              name: 'ambient',
              enabled: true,
              sourceRoot: '/ambient/skill',
            },
          ]
    },
  }

  return {
    root,
    workspace,
    source,
    controlledHome: await realpath(controlledHome),
    controlledCodexHome: await realpath(controlledCodexHome),
    nativeJournal,
    queryPort,
    readiness,
    get readinessReads() {
      return readinessReads
    },
    get readinessState() {
      return readinessState
    },
    set readinessState(
      value:
        | 'ready'
        | 'workspace_not_ready'
        | 'setup_transition_active',
    ) {
      readinessState = value
    },
    set readinessSequence(
      value: (
        | 'ready'
        | 'workspace_not_ready'
        | 'setup_transition_active'
      )[],
    ) {
      readinessSequence = value
    },
    set nativeMode(value: 'exact' | 'extra') {
      nativeMode = value
    },
    set beforeSkillsList(value: () => Promise<void>) {
      beforeSkillsList = value
    },
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}
