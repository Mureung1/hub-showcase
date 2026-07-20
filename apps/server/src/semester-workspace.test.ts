import assert from 'node:assert/strict'
import {
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

test('a newer workspace store opens as actionable read-only state without changing its bytes', async () => {
  const testRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-newer-store-test-'),
  )
  const packageRoot = path.join(testRoot, 'package')
  const appDataRoot = path.join(testRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'semester')
  const productRoot = path.join(workspaceRoot, '.ay-ple')
  const storePath = path.join(productRoot, 'workspace-state.json')
  const newerStore = '{"formatVersion":3,"futureState":"keep exactly"}\n'
  const runtime = new ControlledRuntime()

  try {
    await Promise.all(
      [packageRoot, appDataRoot, productRoot].map((directory) =>
        mkdir(directory, { recursive: true }),
      ),
    )
    await writeFile(storePath, newerStore, 'utf8')
    const application = await createServerApplication({
      codexChat: configuredBootstrap(runtime),
      semesterWorkspace: {
        packageRoot,
        appDataRoot,
        chooseDirectory: async () => workspaceRoot,
      },
    })
    const controller = application.semesterWorkspace
    assert.ok(controller)

    try {
      assert.deepEqual(await controller.activate(), {
        status: 'activated',
        workspace: {
          state: 'incompatible',
          readOnly: true,
          supportedStoreFormatVersion: 2,
          foundStoreFormatVersion: 3,
          displayMessage:
            '이 SemesterWorkspace는 더 최신 버전의 AY-PLE에서 생성되었습니다. 최신 AY-PLE로 다시 여세요.',
        },
      })
      await assert.rejects(
        controller.createCourse('바꾸면 안 되는 과목'),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'workspace_incompatible',
      )
      assert.throws(
        () => controller.nativeCwd(),
        (error: unknown) =>
          error instanceof SemesterWorkspaceError &&
          error.code === 'workspace_incompatible',
      )
      assert.equal(runtime.startThreadCalls, 0)
      assert.equal(runtime.startTurnCalls, 0)
      assert.equal(await readFile(storePath, 'utf8'), newerStore)
    } finally {
      await application.close()
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
