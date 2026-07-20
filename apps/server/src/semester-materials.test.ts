import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  mkdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import {
  createSemesterWorkspaceController,
  SemesterWorkspaceError,
} from './semester-workspace.js'
import { configuredBootstrap, ControlledRuntime } from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'
import { materializeE2eSemesterWorkspace } from '../../../scripts/semester-workspace-materializer.mjs'

test('material refresh registers only bounded workspace TXT with stable opaque identity', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  const outsideText = path.join(materialized.runRoot, 'outside.txt')
  const unreadableText = path.join(materialized.workspaceRoot, 'unreadable.txt')

  try {
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    await Promise.all([
      writeFile(path.join(materialized.workspaceRoot, 'unsupported.md'), 'skip'),
      writeFile(path.join(materialized.workspaceRoot, 'invalid.txt'), Buffer.from([0xc3, 0x28])),
      writeFile(path.join(materialized.workspaceRoot, 'oversized.txt'), Buffer.alloc(1_048_577, 0x61)),
      writeFile(outsideText, 'outside'),
      writeFile(unreadableText, 'unreadable'),
    ])
    await mkdir(path.join(materialized.workspaceRoot, '.ay-ple'), {
      recursive: true,
    })
    await writeFile(
      path.join(materialized.workspaceRoot, '.ay-ple', 'private.txt'),
      'app-owned',
    )
    await symlink(outsideText, path.join(materialized.workspaceRoot, 'escape.txt'))
    await chmod(unreadableText, 0o000)

    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    await controller.activate()
    const refreshed = await controller.refreshMaterials()

    assert.equal(refreshed.state, 'ready')
    assert.deepEqual(
      refreshed.materials.map((material) => material.relativePath),
      [
        'lms-outline-notice.txt',
        'problem-solving-syllabus.txt',
        'unselected-control.txt',
      ],
    )
    for (const material of refreshed.materials) {
      assert.match(material.id, /^material_[0-9a-f]{32}$/)
      assert.equal(material.mediaType, 'text/plain; charset=utf-8')
      const bytes = await readFile(
        path.join(materialized.workspaceRoot, material.relativePath),
      )
      assert.equal(material.size, bytes.byteLength)
      assert.equal(
        material.digest,
        createHash('sha256').update(bytes).digest('hex'),
      )
    }

    const before = refreshed.materials.find(
      (material) => material.relativePath === 'problem-solving-syllabus.txt',
    )
    assert.ok(before)
    await chmod(unreadableText, 0o600)
    await writeFile(
      path.join(materialized.workspaceRoot, before.relativePath),
      `${await readFile(path.join(materialized.workspaceRoot, before.relativePath), 'utf8')}\n변경됨\n`,
      'utf8',
    )
    const changed = await controller.refreshMaterials()
    const changedMaterial = changed.materials.find(
      (material) => material.relativePath === before.relativePath,
    )
    assert.equal(changedMaterial?.id, before.id)
    assert.notEqual(changedMaterial?.digest, before.digest)

    const reopened = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    const reopenedSnapshot = await reopened.activate()
    assert.equal(reopenedSnapshot.status, 'activated')
    assert.deepEqual(
      reopened.snapshot()?.state === 'ready'
        ? reopened.snapshot()?.materials
        : undefined,
      changed.materials,
    )
    assert.deepEqual((await reopened.refreshMaterials()).materials, changed.materials)
  } finally {
    await chmod(unreadableText, 0o600).catch(() => undefined)
    await rm(outsideText, { force: true })
    await materialized.cleanup()
  }
})

test('material preview revalidates registry digest and refuses a path that becomes a workspace escape', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  const outsideText = path.join(materialized.runRoot, 'replacement.txt')

  try {
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    const controller = createSemesterWorkspaceController({
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    })
    await controller.activate()
    const snapshot = await controller.refreshMaterials()
    const material = snapshot.materials.find(
      (candidate) => candidate.relativePath === 'lms-outline-notice.txt',
    )
    assert.ok(material)

    const preview = await controller.readMaterialPreview({
      materialId: material.id,
      digest: material.digest,
    })
    assert.equal(preview.materialId, material.id)
    assert.equal(preview.digest, material.digest)
    assert.equal(preview.relativePath, material.relativePath)
    assert.match(preview.text, /개요 작성하기/)
    assert.equal(preview.truncated, false)

    await assert.rejects(
      controller.readMaterialPreview({
        materialId: material.id,
        digest: '0'.repeat(64),
      }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'material_stale',
    )

    const registeredPath = path.join(
      materialized.workspaceRoot,
      material.relativePath,
    )
    await writeFile(outsideText, 'escaped replacement', 'utf8')
    await rm(registeredPath)
    await symlink(outsideText, registeredPath)
    await assert.rejects(
      controller.readMaterialPreview({
        materialId: material.id,
        digest: material.digest,
      }),
      (error: unknown) =>
        error instanceof SemesterWorkspaceError &&
        error.code === 'material_stale',
    )
  } finally {
    await rm(outsideText, { force: true })
    await materialized.cleanup()
  }
})

test('product HTTP snapshot and preview are no-store, path-safe, and Origin guarded', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  const runtime = new ControlledRuntime()

  try {
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime, {
          origin: 'http://127.0.0.1:4173',
        }),
        semesterWorkspace: {
          packageRoot,
          appDataRoot,
          chooseDirectory: async () => materialized.workspaceRoot,
        },
      },
      async (baseUrl, application) => {
        const mutationHeaders = {
          'content-type': 'application/json',
          origin: 'http://127.0.0.1:4173',
        }
        const activation = await fetch(
          `${baseUrl}/api/product/workspaces/activate`,
          {
            method: 'POST',
            headers: mutationHeaders,
            body: '{}',
          },
        )
        assert.equal(activation.status, 200)
        const activated = (await activation.json()) as {
          readonly status: string
          readonly workspace: Record<string, unknown>
        }
        assert.equal(activated.status, 'activated')
        assertReadyWorkspaceEnvelopeKeys(activated.workspace)

        const createCourse = await fetch(`${baseUrl}/api/product/courses`, {
          method: 'POST',
          headers: mutationHeaders,
          body: JSON.stringify({ displayName: '문제해결글쓰기' }),
        })
        assert.equal(createCourse.status, 201)
        const created = (await createCourse.json()) as {
          readonly workspace: Record<string, unknown>
        }
        assertReadyWorkspaceEnvelopeKeys(created.workspace)

        const forbidden = await fetch(`${baseUrl}/api/product/materials/refresh`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'https://example.com',
          },
          body: '{}',
        })
        assert.equal(forbidden.status, 403)

        const refresh = await fetch(`${baseUrl}/api/product/materials/refresh`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'http://127.0.0.1:4173',
          },
          body: '{}',
        })
        assert.equal(refresh.status, 200)
        const refreshed = (await refresh.json()) as {
          readonly workspace: {
            readonly materials: readonly {
              readonly id: string
              readonly relativePath: string
              readonly digest: string
            }[]
          }
        }
        const internalSnapshot = application.semesterWorkspace?.snapshot()
        assert.equal(internalSnapshot?.state, 'ready')
        if (internalSnapshot?.state === 'ready') {
          assert.equal(internalSnapshot.storeFormatVersion, 2)
        }
        assertReadyWorkspaceEnvelopeKeys(refreshed.workspace)
        assert.equal(JSON.stringify(refreshed).includes(materialized.runRoot), false)

        const bootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
        assert.equal(bootstrap.status, 200)
        assert.equal(bootstrap.headers.get('cache-control'), 'no-store')
        assert.deepEqual(await bootstrap.json(), refreshed)

        const material = refreshed.workspace.materials[0]
        assert.ok(material)
        const preview = await fetch(
          `${baseUrl}/api/product/materials/${material.id}/preview?digest=${material.digest}`,
        )
        assert.equal(preview.status, 200)
        assert.equal(preview.headers.get('cache-control'), 'no-store')
        const previewBody = await preview.text()
        assert.equal(previewBody.includes(materialized.runRoot), false)
        assert.deepEqual(
          Object.keys(JSON.parse(previewBody) as Record<string, unknown>).sort(),
          [
            'digest',
            'materialId',
            'mediaType',
            'relativePath',
            'size',
            'text',
            'truncated',
          ],
        )

        const stale = await fetch(
          `${baseUrl}/api/product/materials/${material.id}/preview?digest=${'0'.repeat(64)}`,
        )
        assert.equal(stale.status, 409)
        assert.equal(stale.headers.get('cache-control'), 'no-store')
        assert.equal((await stale.json()).code, 'material_stale')
      },
    )
  } finally {
    await materialized.cleanup()
  }
})

test('product HTTP keeps the active workspace for a symlink store candidate', async () => {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  const candidateRoot = path.join(materialized.runRoot, 'incompatible-semester')
  const candidateProductRoot = path.join(candidateRoot, '.ay-ple')
  const candidateStorePath = path.join(
    candidateProductRoot,
    'workspace-state.json',
  )
  const candidateStoreTarget = path.join(
    candidateRoot,
    'original-workspace-state.json',
  )
  const candidateStoreBytes = Buffer.from(
    '{"formatVersion":3,"futureState":"keep exactly"}\n',
    'utf8',
  )
  let selectedWorkspaceRoot = materialized.workspaceRoot

  try {
    await Promise.all([
      mkdir(packageRoot),
      mkdir(appDataRoot),
      mkdir(candidateProductRoot, { recursive: true }),
    ])
    await writeFile(candidateStoreTarget, candidateStoreBytes)
    await symlink(candidateStoreTarget, candidateStorePath)
    await withTestServer(
      {
        codexChat: configuredBootstrap(new ControlledRuntime()),
        semesterWorkspace: {
          packageRoot,
          appDataRoot,
          chooseDirectory: async () => selectedWorkspaceRoot,
        },
      },
      async (baseUrl) => {
        const activationRequest = {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        }
        const initialActivation = await fetch(
          `${baseUrl}/api/product/workspaces/activate`,
          activationRequest,
        )
        assert.equal(initialActivation.status, 200)
        const initialBootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
        assert.equal(initialBootstrap.status, 200)
        const initialSnapshot: unknown = await initialBootstrap.json()

        selectedWorkspaceRoot = candidateRoot
        const rejectedActivation = await fetch(
          `${baseUrl}/api/product/workspaces/activate`,
          activationRequest,
        )
        assert.equal(rejectedActivation.status, 409)
        assert.deepEqual(await rejectedActivation.json(), {
          code: 'workspace_incompatible',
          displayMessage:
            '이 학기 작업공간의 제품 상태를 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.',
        })

        const currentBootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
        assert.equal(currentBootstrap.status, 200)
        assert.deepEqual(await currentBootstrap.json(), initialSnapshot)
        assert.equal(await readlink(candidateStorePath), candidateStoreTarget)
        assert.deepEqual(await readFile(candidateStoreTarget), candidateStoreBytes)
      },
    )
  } finally {
    await materialized.cleanup()
  }
})

function assertReadyWorkspaceEnvelopeKeys(
  workspace: Record<string, unknown>,
): void {
  assert.deepEqual(Object.keys(workspace).sort(), [
    'confirmedRevision',
    'course',
    'materials',
    'state',
  ])
}
