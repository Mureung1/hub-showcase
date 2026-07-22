import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import {
  canonicalSemesterWorkspaceSeed,
  canonicalSemesterWorkspaceSeedDigest,
  digestDirectory,
  materializeDevelopmentSemesterWorkspace,
  materializeE2eSemesterWorkspace,
} from './semester-workspace-materializer.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = path.resolve(import.meta.dirname, '..')

test('development materializer creates a repeatable sibling SemesterWorkspace without changing the tracked seed', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-development-workspace-test-'),
  )
  const packageRoot = path.join(testRoot, 'package-root')
  const parentSentinel = path.join(testRoot, 'keep-parent.txt')

  try {
    await mkdir(packageRoot)
    await writeFile(parentSentinel, 'keep me', 'utf8')
    const seedDigestBefore = await digestDirectory(
      canonicalSemesterWorkspaceSeed,
    )

    const first = await materializeDevelopmentSemesterWorkspace({
      packageRoot,
      environment: {},
    })
    await writeFile(path.join(first.workspaceRoot, 'reset-me.txt'), 'stale', 'utf8')
    const second = await materializeDevelopmentSemesterWorkspace({
      packageRoot,
      environment: {},
    })

    assert.deepEqual(second, first)
    assert.equal(
      first.workspaceRoot,
      path.join(
        await realpath(testRoot),
        '.ay-ple-dev-workspaces',
        'first-assignment-semester-workspace',
      ),
    )
    await assert.rejects(readFile(path.join(first.workspaceRoot, 'reset-me.txt')))
    assert.equal(await readFile(parentSentinel, 'utf8'), 'keep me')
    const selectedMaterial = await readFile(
      path.join(first.workspaceRoot, 'lms-outline-notice.txt'),
      'utf8',
    )
    const negativeControl = await readFile(
      path.join(first.workspaceRoot, 'unselected-control.txt'),
      'utf8',
    )
    assert.equal(
      selectedMaterial,
      await readFile(
        path.join(canonicalSemesterWorkspaceSeed, 'lms-outline-notice.txt'),
        'utf8',
      ),
    )
    assert.equal(
      negativeControl,
      await readFile(
        path.join(canonicalSemesterWorkspaceSeed, 'unselected-control.txt'),
        'utf8',
      ),
    )
    assert.ok(
      selectedMaterial.includes(
        '2026년 7월 12일 23:59 KST(Asia/Seoul)입니다.\nRFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
      ),
    )
    assert.ok(
      negativeControl.includes(
        '2026년 8월 31일 18:00 KST(Asia/Seoul)입니다.\nRFC 3339 마감 시각은 2026-08-31T18:00:00+09:00입니다.',
      ),
    )
    assert.equal(
      await digestDirectory(canonicalSemesterWorkspaceSeed),
      seedDigestBefore,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('E2E materializer creates isolated runs, ignores ambient development workspace, and cleans only its owned run root', async () => {
  const ambientRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-ambient-workspace-test-'),
  )
  const seedDigestBefore = await digestDirectory(
    canonicalSemesterWorkspaceSeed,
  )

  const previousAmbientWorkspace = process.env.CODEX_CHAT_WORKSPACE
  process.env.CODEX_CHAT_WORKSPACE = ambientRoot
  const first = await materializeE2eSemesterWorkspace()
  const second = await materializeE2eSemesterWorkspace()

  try {
    assert.equal(seedDigestBefore, canonicalSemesterWorkspaceSeedDigest)
    assert.notEqual(first.runId, second.runId)
    assert.notEqual(first.runRoot, second.runRoot)
    assert.notEqual(first.workspaceRoot, second.workspaceRoot)
    assert.notEqual(first.workspaceRoot, await realpath(ambientRoot))
    assert.equal(await digestDirectory(first.workspaceRoot), seedDigestBefore)
    assert.equal(await digestDirectory(second.workspaceRoot), seedDigestBefore)

    const firstProductRoot = path.join(first.workspaceRoot, '.ay-ple')
    const firstScratch = path.join(firstProductRoot, 'runtime-scratch', 'run-one')
    await mkdir(firstScratch, { recursive: true })
    await writeFile(
      path.join(firstProductRoot, 'workspace-state.json'),
      '{"run":"one"}\n',
      'utf8',
    )
    await writeFile(path.join(firstScratch, 'only-first.txt'), 'scratch', 'utf8')
    await assert.rejects(
      readFile(path.join(second.workspaceRoot, '.ay-ple', 'workspace-state.json')),
    )
    await assert.rejects(
      readFile(
        path.join(
          canonicalSemesterWorkspaceSeed,
          '.ay-ple',
          'workspace-state.json',
        ),
      ),
    )

    await first.cleanup()

    await assert.rejects(readFile(first.workspaceRoot))
    assert.equal(await digestDirectory(second.workspaceRoot), seedDigestBefore)
    assert.equal(
      await digestDirectory(canonicalSemesterWorkspaceSeed),
      seedDigestBefore,
    )
  } finally {
    if (previousAmbientWorkspace === undefined) {
      delete process.env.CODEX_CHAT_WORKSPACE
    } else {
      process.env.CODEX_CHAT_WORKSPACE = previousAmbientWorkspace
    }
    await first.cleanup()
    await second.cleanup()
    await rm(ambientRoot, { force: true, recursive: true })
  }
})

test('development workspace override remains caller-owned and unsafe roots fail closed', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-workspace-override-test-'),
  )
  const packageRoot = path.join(testRoot, 'package-root')
  const callerWorkspace = path.join(testRoot, 'caller-workspace')
  const runtimeHome = path.join(callerWorkspace, 'runtime-home')
  const symlinkWorkspace = path.join(testRoot, 'workspace-link')

  try {
    await Promise.all([mkdir(packageRoot), mkdir(callerWorkspace)])
    await writeFile(
      path.join(callerWorkspace, 'caller-owned.txt'),
      'do not replace',
      'utf8',
    )
    await mkdir(runtimeHome)
    await symlink(callerWorkspace, symlinkWorkspace)

    const selected = await materializeDevelopmentSemesterWorkspace({
      packageRoot,
      environment: { CODEX_CHAT_WORKSPACE: callerWorkspace },
    })

    assert.deepEqual(selected, {
      ownership: 'caller',
      workspaceRoot: await realpath(callerWorkspace),
    })
    assert.equal(
      await readFile(path.join(callerWorkspace, 'caller-owned.txt'), 'utf8'),
      'do not replace',
    )
    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        packageRoot,
        environment: { CODEX_CHAT_WORKSPACE: packageRoot },
      }),
      /overlap/,
    )
    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        packageRoot,
        environment: { CODEX_CHAT_WORKSPACE: 'relative-workspace' },
      }),
      /absolute/,
    )
    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        packageRoot,
        environment: { CODEX_CHAT_WORKSPACE: symlinkWorkspace },
      }),
      /non-symlink/,
    )
    assert.equal(
      (
        await materializeDevelopmentSemesterWorkspace({
          packageRoot,
          environment: {
            CODEX_CHAT_WORKSPACE: callerWorkspace,
            CODEX_CHAT_RUNTIME_HOME: runtimeHome,
          },
        })
      ).workspaceRoot,
      await realpath(callerWorkspace),
    )
    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        appDataRoot: runtimeHome,
        packageRoot,
        environment: { CODEX_CHAT_WORKSPACE: callerWorkspace },
      }),
      /overlap/,
    )
    await chmod(callerWorkspace, 0o000)
    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        packageRoot,
        environment: { CODEX_CHAT_WORKSPACE: callerWorkspace },
      }),
      /readable/,
    )
    await chmod(callerWorkspace, 0o700)
  } finally {
    await chmod(callerWorkspace, 0o700).catch(() => undefined)
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('development materializer rejects a symlinked managed parent without touching its target', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-symlinked-managed-parent-test-'),
  )
  const externalRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-external-managed-parent-test-'),
  )
  const packageRoot = path.join(testRoot, 'package-root')
  const managedParent = path.join(testRoot, '.ay-ple-dev-workspaces')
  const externalSentinel = path.join(externalRoot, 'preserve.txt')

  try {
    await mkdir(packageRoot)
    await writeFile(externalSentinel, 'preserve', 'utf8')
    await symlink(externalRoot, managedParent)

    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        packageRoot,
        environment: {},
      }),
      /non-symlink/,
    )
    assert.equal(await readFile(externalSentinel, 'utf8'), 'preserve')
    await assert.rejects(
      readFile(
        path.join(
          externalRoot,
          'first-assignment-semester-workspace',
          'lms-outline-notice.txt',
        ),
      ),
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
    await rm(externalRoot, { force: true, recursive: true })
  }
})

test('default development workspace ignores legacy roots and rejects explicit app data overlap', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-default-workspace-overlap-test-'),
  )
  const packageRoot = path.join(testRoot, 'package-root')
  const managedParent = path.join(testRoot, '.ay-ple-dev-workspaces')

  try {
    await Promise.all([mkdir(packageRoot), mkdir(managedParent)])

    const selected = await materializeDevelopmentSemesterWorkspace({
      packageRoot,
      environment: { CODEX_CHAT_RUNTIME_HOME: managedParent },
    })
    assert.equal(
      selected.workspaceRoot,
      await realpath(
        path.join(managedParent, 'first-assignment-semester-workspace'),
      ),
    )
    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        appDataRoot: managedParent,
        packageRoot,
        environment: {},
      }),
      /overlap/,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('development materializer rejects package and app data root overlap before workspace selection', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-product-root-overlap-test-'),
  )
  const callerWorkspace = path.join(testRoot, 'caller-workspace')
  const packageParent = path.join(testRoot, 'package-parent')
  const packageRoot = path.join(packageParent, 'package-root')
  const packageChildAppData = path.join(packageRoot, 'app-data')
  const appDataParent = path.join(testRoot, 'app-data-parent')
  const appDataChildPackage = path.join(appDataParent, 'package-root')
  const sentinel = path.join(callerWorkspace, 'preserve.txt')

  try {
    await Promise.all([
      mkdir(callerWorkspace),
      mkdir(packageChildAppData, { recursive: true }),
      mkdir(appDataChildPackage, { recursive: true }),
    ])
    await writeFile(sentinel, 'preserve', 'utf8')

    for (const roots of [
      { packageRoot, appDataRoot: packageChildAppData },
      { packageRoot: appDataChildPackage, appDataRoot: appDataParent },
      { packageRoot, appDataRoot: packageRoot },
    ]) {
      await assert.rejects(
        materializeDevelopmentSemesterWorkspace({
          ...roots,
          environment: { CODEX_CHAT_WORKSPACE: callerWorkspace },
        }),
        /overlap/,
      )
    }

    assert.equal(await readFile(sentinel, 'utf8'), 'preserve')
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('development materializer refuses to reset an unmarked default leaf', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-unmarked-workspace-test-'),
  )
  const packageRoot = path.join(testRoot, 'package-root')
  const workspaceRoot = path.join(
    testRoot,
    '.ay-ple-dev-workspaces',
    'first-assignment-semester-workspace',
  )
  const sentinel = path.join(workspaceRoot, 'caller-data.txt')

  try {
    await Promise.all([
      mkdir(packageRoot),
      mkdir(workspaceRoot, { recursive: true }),
    ])
    await writeFile(sentinel, 'preserve', 'utf8')

    await assert.rejects(
      materializeDevelopmentSemesterWorkspace({
        packageRoot,
        environment: {},
      }),
      /ownership marker is missing/,
    )
    assert.equal(await readFile(sentinel, 'utf8'), 'preserve')
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('repository development command reports the selected canonical workspace without changing an override', async () => {
  const callerWorkspace = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-command-workspace-test-'),
  )
  try {
    await writeFile(
      path.join(callerWorkspace, 'caller-owned.txt'),
      'preserved',
      'utf8',
    )
    const { stdout } = await execFileAsync(
      'npm',
      ['run', 'materialize:dev-workspace', '--silent'],
      {
        cwd: repositoryRoot,
        env: { ...process.env, CODEX_CHAT_WORKSPACE: callerWorkspace },
      },
    )

    assert.equal(
      stdout,
      `SemesterWorkspace: ${await realpath(callerWorkspace)} (caller-owned)\n`,
    )
    assert.equal(
      await readFile(path.join(callerWorkspace, 'caller-owned.txt'), 'utf8'),
      'preserved',
    )
  } finally {
    await rm(callerWorkspace, { force: true, recursive: true })
  }
})
