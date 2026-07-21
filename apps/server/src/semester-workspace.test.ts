import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createSemesterWorkspaceController,
  SemesterWorkspaceError,
} from './semester-workspace.js'
import { createServerApplication } from './server.js'
import {
  configuredBootstrap,
  ControlledRuntime,
} from './testing/codex-chat-test-support.js'
import {
  canonicalSemesterWorkspaceSeed,
  digestDirectory,
  materializeE2eSemesterWorkspace,
  materializeScanLimitSemesterWorkspace,
} from '../../../scripts/semester-workspace-materializer.mjs'

function expectedIncompatibleActivation(
  foundStoreFormatVersion: number | null,
) {
  return {
    status: 'activated',
    workspace: {
      state: 'incompatible',
      readOnly: true,
      supportedStoreFormatVersion: 2,
      foundStoreFormatVersion,
      displayMessage:
        '이 SemesterWorkspace의 제품 상태는 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.',
    },
  }
}

test('a chosen SemesterWorkspace reopens the same Course and confirmed revision without app data', async () => {
  const seedDigestBefore = await digestDirectory(
    canonicalSemesterWorkspaceSeed,
  )
  const materializedWorkspace = await materializeE2eSemesterWorkspace()
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-workspace-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(materializedWorkspace.runRoot, 'app-data')
  const workspaceRoot = materializedWorkspace.workspaceRoot

  try {
    await Promise.all(
      [packageRoot, appDataRoot].map((directory) => mkdir(directory)),
    )
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => workspaceRoot,
    })

    const activation = await controller.activate()
    assert.equal(activation.status, 'activated')
    assert.equal(activation.workspace.state, 'ready')
    assert.equal(activation.workspace.course, null)
    assert.equal(activation.workspace.confirmedRevision, 0)
    assert.deepEqual(
      activation.workspace.materials.map((material) => material.relativePath),
      [
        'lms-outline-notice.txt',
        'problem-solving-syllabus.txt',
        'unselected-control.txt',
      ],
    )
    const created = await controller.createCourse('문제해결글쓰기')

    assert.equal(created.state, 'ready')
    assert.equal(created.confirmedRevision, 0)
    assert.equal(created.course?.displayName, '문제해결글쓰기')
    assert.match(created.course?.id ?? '', /^course_[0-9a-f]{32}$/)
    assert.equal(controller.nativeCwd(), await realpath(workspaceRoot))
    assert.equal(JSON.stringify(created).includes(await realpath(testRoot)), false)
    const changedMaterialPath = path.join(
      workspaceRoot,
      'lms-outline-notice.txt',
    )
    const changedMaterialBytes = Buffer.from(
      '학생이 앱을 닫은 동안 수정한 공지',
      'utf8',
    )
    await writeFile(changedMaterialPath, changedMaterialBytes)

    await rm(appDataRoot, { recursive: true })
    await mkdir(appDataRoot)
    const reopenedController = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => workspaceRoot,
    })
    const reopened = await reopenedController.activate()

    assert.equal(reopened.status, 'activated')
    assert.deepEqual(reopened.workspace, created)
    assert.deepEqual(
      await reopenedController.selectCourse(created.course?.id ?? ''),
      created,
    )
    const refreshed = await reopenedController.refreshMaterials()
    assert.equal(refreshed.outcome, 'refreshed')
    assert.equal(refreshed.workspace.recovery, null)
    assert.equal(
      refreshed.workspace.materials.find(
        (material) => material.relativePath === 'lms-outline-notice.txt',
      )?.digest,
      createHash('sha256').update(changedMaterialBytes).digest('hex'),
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
    await materializedWorkspace.cleanup()
    assert.equal(
      await digestDirectory(canonicalSemesterWorkspaceSeed),
      seedDigestBefore,
    )
  }
})

test('cancelled and invalid chooser results preserve the existing activation', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-chooser-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const packageChild = path.join(packageRoot, 'nested')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const workspaceLink = path.join(testRoot, 'semester-link')
  let chooserResult: string | null = workspaceRoot

  try {
    await Promise.all(
      [packageChild, appDataRoot, workspaceRoot].map((directory) =>
        mkdir(directory, { recursive: true }),
      ),
    )
    await symlink(workspaceRoot, workspaceLink)
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => chooserResult,
    })
    await controller.activate()
    const active = await controller.createCourse('문제해결글쓰기')
    const activeCwd = controller.nativeCwd()

    chooserResult = null
    assert.deepEqual(await controller.activate(), {
      status: 'cancelled',
      workspace: active,
    })

    for (const invalid of [
      'relative-workspace',
      path.join(testRoot, 'missing'),
      workspaceLink,
      packageRoot,
      packageChild,
      appDataRoot,
    ]) {
      chooserResult = invalid
      await assert.rejects(
        controller.activate(),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          (error.code === 'root_invalid' || error.code === 'root_overlap'),
      )
      assert.deepEqual(controller.snapshot(), active)
      assert.equal(controller.nativeCwd(), activeCwd)
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('active store drift blocks every replacement and explicit reactivation adopts valid current bytes', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-store-authority-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const storePath = path.join(workspaceRoot, '.ay-ple', 'workspace-state.json')

  try {
    await Promise.all(
      [packageRoot, appDataRoot, workspaceRoot].map((directory) =>
        mkdir(directory),
      ),
    )
    await writeFile(path.join(workspaceRoot, 'notice.txt'), '원본 공지', 'utf8')
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => workspaceRoot,
    })
    await controller.activate()
    await controller.createCourse('기존 과목')

    const externallyEdited = JSON.parse(
      await readFile(storePath, 'utf8'),
    ) as Record<string, unknown>
    externallyEdited.course = {
      ...(externallyEdited.course as Record<string, unknown>),
      displayName: '외부에서 바꾼 과목',
    }
    const externalBytes = Buffer.from(
      `${JSON.stringify(externallyEdited, null, 2)}\n`,
      'utf8',
    )
    await writeFile(storePath, externalBytes)

    await assert.rejects(
      controller.refreshMaterials(),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'execution_guard_conflict',
    )
    assert.deepEqual(await readFile(storePath), externalBytes)
    const conflicted = controller.snapshot()
    assert.equal(conflicted?.state, 'ready')
    if (conflicted?.state !== 'ready') assert.fail('workspace must be ready')
    assert.equal(conflicted.recovery?.state, 'store_conflict')

    const reactivated = await controller.activate()
    assert.equal(reactivated.status, 'activated')
    assert.equal(reactivated.workspace.state, 'ready')
    assert.equal(reactivated.workspace.course?.displayName, '외부에서 바꾼 과목')
    assert.equal(reactivated.workspace.recovery, null)
    assert.deepEqual(await readFile(storePath), externalBytes)

    const nonCanonicalBytes = Buffer.from(JSON.stringify(externallyEdited), 'utf8')
    await writeFile(storePath, nonCanonicalBytes)
    const coldController = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => workspaceRoot,
    })
    const coldActivation = await coldController.activate()
    assert.equal(coldActivation.status, 'activated')
    assert.equal(
      coldActivation.workspace.course?.displayName,
      '외부에서 바꾼 과목',
    )
    assert.deepEqual(await readFile(storePath), nonCanonicalBytes)
    assert.equal((await coldController.refreshMaterials()).outcome, 'refreshed')
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('same-root invalid store recovery becomes read-only without changing the store entry or source bytes', async () => {
  for (const kind of ['invalid-json', 'directory'] as const) {
    const testRoot = await mkdtemp(
      path.join(tmpdir(), `ay-ple-semester-same-root-${kind}-test-`),
    )
    const packageRoot = path.join(testRoot, 'package')
    const appDataRoot = path.join(testRoot, 'app-data')
    const workspaceRoot = path.join(testRoot, 'semester')
    const sourcePath = path.join(workspaceRoot, 'notice.txt')
    const storePath = path.join(
      workspaceRoot,
      '.ay-ple',
      'workspace-state.json',
    )
    const sourceBytes = Buffer.from('사용자 소유 원본 자료', 'utf8')
    const invalidBytes = Buffer.from('{"formatVersion":2,\n', 'utf8')
    const sentinelBytes = Buffer.from('directory entry must remain', 'utf8')
    const sentinelPath = path.join(storePath, 'sentinel.txt')

    try {
      await Promise.all(
        [packageRoot, appDataRoot, workspaceRoot].map((directory) =>
          mkdir(directory),
        ),
      )
      await writeFile(sourcePath, sourceBytes)
      const controller = createSemesterWorkspaceController({
        packageRoot,
        appDataRoot,
        chooseDirectory: async () => workspaceRoot,
      })
      await controller.activate()
      const ready = await controller.createCourse('문제해결글쓰기')
      assert.ok(ready.course)
      const operationId =
        kind === 'invalid-json'
          ? `chat_${'8'.repeat(32)}`
          : `chat_${'9'.repeat(32)}`
      await controller.prepareProductChatExecution({
        operationId,
        courseId: ready.course.id,
        selectedMaterials: [],
      })

      if (kind === 'invalid-json') {
        await writeFile(storePath, invalidBytes)
      } else {
        await rm(storePath)
        await mkdir(storePath)
        await writeFile(sentinelPath, sentinelBytes)
      }

      await assert.rejects(
        controller.settleProductChatExecution({ operationId }),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'execution_guard_conflict',
        kind,
      )
      const conflicted = controller.snapshot()
      assert.equal(conflicted?.state, 'ready', kind)
      if (conflicted?.state !== 'ready') assert.fail('workspace must be ready')
      assert.equal(conflicted.recovery?.state, 'store_conflict', kind)
      await assert.rejects(
        controller.activate(),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'execution_guard_conflict',
        kind,
      )
      controller.noteProductOperationReleased(operationId)

      assert.deepEqual(
        await controller.activate(),
        expectedIncompatibleActivation(null),
        kind,
      )
      assert.equal(controller.snapshot()?.state, 'incompatible', kind)
      assert.throws(
        () => controller.nativeCwd(),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'workspace_incompatible',
        kind,
      )
      await assert.rejects(
        controller.createCourse('덮어쓰면 안 되는 과목'),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'workspace_incompatible',
        kind,
      )
      assert.deepEqual(await readFile(sourcePath), sourceBytes, kind)
      if (kind === 'invalid-json') {
        assert.deepEqual(await readFile(storePath), invalidBytes, kind)
      } else {
        assert.equal((await lstat(storePath)).isDirectory(), true, kind)
        assert.deepEqual(await readFile(sentinelPath), sentinelBytes, kind)
      }
    } finally {
      await rm(testRoot, { force: true, recursive: true })
    }
  }
})

test('activation keeps the current workspace authoritative when the candidate initial scan fails', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-activation-transaction-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const currentWorkspaceRoot = path.join(testRoot, 'current-semester')
  const candidateWorkspaceRoot = path.join(testRoot, 'candidate-semester')
  let chooserResult = currentWorkspaceRoot

  try {
    await Promise.all(
      [
        packageRoot,
        appDataRoot,
        currentWorkspaceRoot,
      ].map((directory) => mkdir(directory)),
    )
    await writeFile(
      path.join(currentWorkspaceRoot, 'current-source.txt'),
      '현재 학기 자료',
      'utf8',
    )
    await materializeScanLimitSemesterWorkspace(candidateWorkspaceRoot)

    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => chooserResult,
    })
    const activation = await controller.activate()
    assert.equal(activation.status, 'activated')
    assert.equal(activation.workspace.state, 'ready')
    assert.deepEqual(
      activation.workspace.materials.map((material) => material.relativePath),
      ['current-source.txt'],
    )
    const current = activation.workspace
    const currentCwd = controller.nativeCwd()

    chooserResult = candidateWorkspaceRoot
    await assert.rejects(
      controller.activate(),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'material_scan_limit',
    )
    assert.deepEqual(controller.snapshot(), current)
    assert.equal(controller.nativeCwd(), currentCwd)
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('non-current workspace stores open through one read-only boundary without changing bytes', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-store-compatibility-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const courseId = `course_${'a'.repeat(32)}`
  const workspaceId = `workspace_${'b'.repeat(32)}`
  const sourceBytes = Buffer.from('호환되지 않는 store의 원본 학기 자료', 'utf8')
  const fixtures = [
    {
      name: 'version 1',
      foundStoreFormatVersion: 1,
      bytes: Buffer.from(
        `${JSON.stringify({
          formatVersion: 1,
          confirmedRevision: 4,
          course: { id: courseId, displayName: '문제해결글쓰기' },
          materials: [],
        })}\n`,
        'utf8',
      ),
    },
    {
      name: 'pre-006 version 2',
      foundStoreFormatVersion: 2,
      bytes: Buffer.from(
        `${JSON.stringify({
          formatVersion: 2,
          workspaceId,
          confirmedRevision: 0,
          course: null,
          materials: [],
          assignments: [],
          statePatches: [],
          userConfirmations: [],
        })}\n`,
        'utf8',
      ),
    },
    {
      name: 'current version 2 without required modelingRuns',
      foundStoreFormatVersion: 2,
      bytes: Buffer.from(
        `${JSON.stringify({
          formatVersion: 2,
          workspaceId,
          confirmedRevision: 0,
          course: null,
          materials: [],
          assignments: [],
          statePatches: [],
          userConfirmations: [],
          executionGuard: null,
        })}\n`,
        'utf8',
      ),
    },
    {
      name: 'current version 2 without required executionGuard',
      foundStoreFormatVersion: 2,
      bytes: Buffer.from(
        `${JSON.stringify({
          formatVersion: 2,
          workspaceId,
          confirmedRevision: 0,
          course: null,
          materials: [],
          assignments: [],
          statePatches: [],
          userConfirmations: [],
          modelingRuns: [],
        })}\n`,
        'utf8',
      ),
    },
    {
      name: 'invalid JSON',
      foundStoreFormatVersion: null,
      bytes: Buffer.from('{"formatVersion":2,\n', 'utf8'),
    },
    {
      name: 'future version',
      foundStoreFormatVersion: 3,
      bytes: Buffer.from(
        '{"formatVersion":3,"futureState":"keep exactly"}\n',
        'utf8',
      ),
    },
  ] as const

  try {
    await Promise.all(
      [packageRoot, appDataRoot].map((directory) => mkdir(directory)),
    )
    for (const fixture of fixtures) {
      const workspaceRoot = path.join(
        testRoot,
        fixture.name.replaceAll(' ', '-'),
      )
      const productRoot = path.join(workspaceRoot, '.ay-ple')
      const storePath = path.join(productRoot, 'workspace-state.json')
      const sourcePath = path.join(workspaceRoot, 'original-source.txt')
      await mkdir(productRoot, { recursive: true })
      await writeFile(sourcePath, sourceBytes)
      await writeFile(storePath, fixture.bytes)
      const controller = createSemesterWorkspaceController({
        packageRoot,
        appDataRoot,
        chooseDirectory: async () => workspaceRoot,
      })

      assert.deepEqual(
        await controller.activate(),
        expectedIncompatibleActivation(fixture.foundStoreFormatVersion),
        fixture.name,
      )
      await assert.rejects(
        controller.createCourse('바꾸면 안 되는 과목'),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'workspace_incompatible',
        fixture.name,
      )
      assert.throws(
        () => controller.nativeCwd(),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'workspace_incompatible',
        fixture.name,
      )
      assert.deepEqual(await readFile(storePath), fixture.bytes, fixture.name)
      assert.deepEqual(await readFile(sourcePath), sourceBytes, fixture.name)
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('a directory at the product store path opens read-only without changing its contents', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-store-directory-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const storePath = path.join(workspaceRoot, '.ay-ple', 'workspace-state.json')
  const sentinelPath = path.join(storePath, 'original-state.txt')
  const sentinelBytes = Buffer.from('directory must remain untouched', 'utf8')

  try {
    await Promise.all([
      mkdir(packageRoot),
      mkdir(appDataRoot),
      mkdir(storePath, { recursive: true }),
    ])
    await writeFile(sentinelPath, sentinelBytes)
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => workspaceRoot,
    })

    assert.deepEqual(
      await controller.activate(),
      expectedIncompatibleActivation(null),
    )
    assert.equal((await lstat(storePath)).isDirectory(), true)
    assert.deepEqual(await readFile(sentinelPath), sentinelBytes)
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('an unreadable product store opens read-only without changing its bytes', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-store-read-failure-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const productRoot = path.join(workspaceRoot, '.ay-ple')
  const storePath = path.join(productRoot, 'workspace-state.json')
  const originalPrefix = Buffer.from('store bytes must remain untouched', 'utf8')
  const sparseFileSize = 2 ** 31

  try {
    await Promise.all([
      mkdir(packageRoot),
      mkdir(appDataRoot),
      mkdir(productRoot, { recursive: true }),
    ])
    await writeFile(storePath, originalPrefix)
    await truncate(storePath, sparseFileSize)
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => workspaceRoot,
    })

    assert.deepEqual(
      await controller.activate(),
      expectedIncompatibleActivation(null),
    )
    assert.equal((await stat(storePath)).size, sparseFileSize)
    const store = await open(storePath, 'r')
    try {
      const preservedPrefix = Buffer.alloc(originalPrefix.length)
      const { bytesRead } = await store.read(
        preservedPrefix,
        0,
        preservedPrefix.length,
        0,
      )
      assert.equal(bytesRead, originalPrefix.length)
      assert.deepEqual(preservedPrefix, originalPrefix)
    } finally {
      await store.close()
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('the local companion exposes injected chooser activation without starting Codex Chat', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-companion-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const runtime = new ControlledRuntime()

  try {
    await Promise.all(
      [packageRoot, appDataRoot, workspaceRoot].map((directory) =>
        mkdir(directory),
      ),
    )
    const application = await createServerApplication({
      codexChat: configuredBootstrap(runtime),
      semesterWorkspace: {
        packageRoot,
        appDataRoot,
        chooseDirectory: async () => workspaceRoot,
      },
    })
    try {
      const activation = await application.semesterWorkspace?.activate()
      assert.equal(activation?.status, 'activated')
      assert.equal(
        application.semesterWorkspace?.nativeCwd(),
        await realpath(workspaceRoot),
      )
      assert.equal(runtime.startThreadCalls, 0)
      assert.equal(runtime.startTurnCalls, 0)
    } finally {
      await application.close()
    }
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('concurrent Course creation settles as exactly one active Course', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-course-race-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')

  try {
    await Promise.all(
      [packageRoot, appDataRoot, workspaceRoot].map((directory) =>
        mkdir(directory),
      ),
    )
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => workspaceRoot,
    })
    await controller.activate()

    const results = await Promise.allSettled([
      controller.createCourse('첫 번째 과목'),
      controller.createCourse('두 번째 과목'),
    ])

    assert.equal(
      results.filter((result) => result.status === 'fulfilled').length,
      1,
    )
    assert.equal(
      results.filter(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof SemesterWorkspaceError &&
          result.reason.code === 'course_already_exists',
      ).length,
      1,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})
