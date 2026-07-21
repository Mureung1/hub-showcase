import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'

import express from 'express'
import { decodeProductBootstrap } from '@ay-ple/product-contract'

import { createProductRouter } from './product-http.js'
import type { ProductOperationCoordinator } from './product-operation-coordinator.js'
import type { SemesterWorkspaceController } from './semester-workspace.js'

const courseId = `course_${'a'.repeat(32)}`
const materialId = `material_${'b'.repeat(32)}`
const assignmentId = `assignment_${'c'.repeat(32)}`
const settledPatchId = `patch_${'d'.repeat(32)}`
const pendingPatchId = `patch_${'e'.repeat(32)}`
const confirmationId = `confirmation_${'f'.repeat(32)}`
const terminalRunId = `run_${'1'.repeat(32)}`
const activeRunId = `run_${'2'.repeat(32)}`
const acceptanceUnknownRunId = `run_${'7'.repeat(32)}`
const now = '2026-07-20T00:00:00.000Z'

test('bootstrap returns safe readiness and settled-only product history', async () => {
  const controller = productSnapshotController()
  await withProductRouter(
    controller,
    async () => ({ state: 'ready' }),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/product/bootstrap`)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      const encoded = await response.text()
      const body = JSON.parse(encoded) as Record<string, unknown>

      assert.deepEqual(decodeProductBootstrap(body), expectedSafeBootstrap())
      for (const privateValue of [
        '/private/workspace',
        '/private/skill/SKILL.md',
        'thread-private',
        'turn-private',
        'proposal-private',
        'decision-private',
        'invocation-private',
        'prompt-private',
        pendingPatchId,
        activeRunId,
        acceptanceUnknownRunId,
      ]) {
        assert.equal(encoded.includes(privateValue), false, privateValue)
      }
    },
  )
})

test('bootstrap keeps the workspace readable when Codex readiness is unavailable', async () => {
  await withProductRouter(
    productSnapshotController(),
    async () => {
      throw new Error('/private/runtime/bootstrap failed')
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/product/bootstrap`)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      const encoded = await response.text()
      const body = JSON.parse(encoded) as {
        readonly accountReadiness: unknown
        readonly operationStatus: unknown
        readonly workspace: unknown
        readonly history: unknown
      }

      assert.deepEqual(body.accountReadiness, {
        state: 'unavailable',
        displayMessage:
          'Codex 상태를 확인할 수 없습니다. 자료 작업공간은 계속 사용할 수 있습니다.',
      })
      assert.equal(body.operationStatus, 'idle')
      assert.deepEqual(body.workspace, expectedSafeBootstrap().workspace)
      assert.deepEqual(body.history, expectedSafeBootstrap().history)
      assert.equal(encoded.includes('/private/runtime'), false)
    },
  )
})

test('bootstrap reads coarse operation status before projecting settled-only state', async () => {
  let statusRead = false
  const source = productSnapshotController()
  const controller = {
    ...source,
    snapshot: () => {
      assert.equal(statusRead, true)
      return source.snapshot()
    },
  } as SemesterWorkspaceController
  await withProductRouter(
    controller,
    async () => ({ state: 'ready' }),
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/product/bootstrap`)
      const body = decodeProductBootstrap(await response.json())

      assert.equal(body.operationStatus, 'active')
      assert.deepEqual(body.history, expectedSafeBootstrap().history)
    },
    () => {
      statusRead = true
      return 'active'
    },
  )
})

function productSnapshotController(): SemesterWorkspaceController {
  return {
    snapshot: () => ({
      state: 'ready',
      storeFormatVersion: 2,
      confirmedRevision: 1,
      course: { id: courseId, displayName: '문제해결글쓰기' },
      materials: [
        {
          id: materialId,
          relativePath: 'notice.txt',
          digest: '3'.repeat(64),
          mediaType: 'text/plain; charset=utf-8',
          size: 12,
        },
      ],
      recovery: null,
      storePath: '/private/workspace/.ay-ple/workspace-state.json',
    }),
    assignmentState: () => ({
      workspaceId: `workspace_${'4'.repeat(32)}`,
      courseId,
      confirmedRevision: 1,
      assignments: [
        {
          id: assignmentId,
          courseId,
          title: '개요 작성하기',
          dueAt: '2026-07-12T23:59:00+09:00',
          submissionMethod: 'LMS 과제함 업로드',
          evidence: [
            {
              field: 'title',
              rawMaterialId: materialId,
              digest: '3'.repeat(64),
              quote: '과제: 개요 작성하기',
            },
          ],
        },
      ],
      statePatches: [
        {
          id: settledPatchId,
          workspaceId: `workspace_${'4'.repeat(32)}`,
          courseId,
          requestKey: 'proposal-private',
          baseRevision: 0,
          summary: 'prompt-private',
          changes: {
            operation: 'assignment.upsert',
            values: {
              title: '개요 작성하기',
              dueAt: '2026-07-12T23:59:00+09:00',
              submissionMethod: 'LMS 과제함 업로드',
            },
          },
          evidence: [],
          origin: 'thread-private:turn-private',
          status: 'applied',
          createdAt: now,
          applyOutcome: {
            type: 'applied',
            assignmentId,
            resultingRevision: 1,
          },
        },
        {
          id: pendingPatchId,
          workspaceId: `workspace_${'4'.repeat(32)}`,
          courseId,
          requestKey: 'pending-private',
          baseRevision: 1,
          summary: 'pending native prompt',
          changes: {
            operation: 'assignment.upsert',
            values: {
              title: '복원하지 않음',
              dueAt: '2026-07-13T23:59:00+09:00',
              submissionMethod: 'LMS',
            },
          },
          evidence: [],
          status: 'pending',
          createdAt: now,
          applyOutcome: null,
        },
      ],
      userConfirmations: [
        {
          id: confirmationId,
          patchId: settledPatchId,
          decisionKey: 'decision-private',
          decision: 'accepted',
          settledAt: now,
          assignmentId,
          resultingRevision: 1,
          outcome: 'applied',
        },
      ],
    }),
    modelingRuns: () => [
      modelingRun({ id: terminalRunId, status: 'completed' }),
      modelingRun({ id: activeRunId, status: 'running' }),
      modelingRun({
        id: acceptanceUnknownRunId,
        status: 'acceptance_unknown',
      }),
    ],
  } as unknown as SemesterWorkspaceController
}

function modelingRun(input: {
  readonly id: string
  readonly status: 'acceptance_unknown' | 'completed' | 'running'
}) {
  const settled = input.status !== 'running'
  return {
    id: input.id,
    actionId: `action_${input.id.slice(4)}`,
    courseId,
    invocationFingerprint: 'invocation-private',
    requestedSkillName: 'ay-ple-first-assignment',
    requestedSkillPath: '/private/skill/SKILL.md',
    recipeName: 'first-assignment',
    recipeVersion: '1',
    recipeDigest: '5'.repeat(64),
    argumentsDigest: '6'.repeat(64),
    sourceBaseline: [{ rawMaterialId: materialId, digest: '3'.repeat(64) }],
    status: input.status,
    validationOutcome:
      input.status === 'completed'
        ? 'passed'
        : input.status === 'acceptance_unknown'
          ? 'unknown'
          : 'pending',
    createdAt: now,
    updatedAt: now,
    nativeCorrelation: {
      threadId: 'thread-private',
      turnId: 'turn-private',
    },
    ...(settled ? { settledAt: now } : {}),
  }
}

function expectedSafeBootstrap() {
  return {
    accountReadiness: { state: 'ready' },
    operationStatus: 'idle',
    workspace: {
      state: 'ready',
      confirmedRevision: 1,
      course: { id: courseId, displayName: '문제해결글쓰기' },
      materials: [
        {
          id: materialId,
          relativePath: 'notice.txt',
          digest: '3'.repeat(64),
          mediaType: 'text/plain; charset=utf-8',
          size: 12,
        },
      ],
      recovery: null,
    },
    history: {
      assignments: [
        {
          id: assignmentId,
          courseId,
          title: '개요 작성하기',
          dueAt: '2026-07-12T23:59:00+09:00',
          submissionMethod: 'LMS 과제함 업로드',
          evidence: [
            {
              field: 'title',
              materialId,
              digest: '3'.repeat(64),
              quote: '과제: 개요 작성하기',
            },
          ],
        },
      ],
      statePatches: [
        {
          id: settledPatchId,
          courseId,
          baseRevision: 0,
          status: 'applied',
          createdAt: now,
          applyOutcome: {
            type: 'applied',
            assignmentId,
            resultingRevision: 1,
          },
        },
      ],
      userConfirmations: [
        {
          id: confirmationId,
          patchId: settledPatchId,
          decision: 'accepted',
          settledAt: now,
          assignmentId,
          resultingRevision: 1,
          outcome: 'applied',
        },
      ],
      modelingRuns: [
        {
          id: terminalRunId,
          actionId: `action_${terminalRunId.slice(4)}`,
          courseId,
          recipe: {
            name: 'first-assignment',
            version: '1',
            requestedSkillName: 'ay-ple-first-assignment',
          },
          sources: [{ materialId, digest: '3'.repeat(64) }],
          retryOfRunId: null,
          recovery: null,
          status: 'completed',
          validationOutcome: 'passed',
          createdAt: now,
          updatedAt: now,
          settledAt: now,
        },
      ],
    },
  }
}

async function withProductRouter(
  controller: SemesterWorkspaceController,
  readAccountReadiness: () => Promise<
    { readonly state: 'ready' } | { readonly state: 'not_ready' }
  >,
  run: (baseUrl: string) => Promise<void>,
  readOperationStatus: () => 'active' | 'idle' = () => 'idle',
): Promise<void> {
  const app = express()
  app.use(
    '/api/product',
    createProductRouter(
      controller,
      undefined,
      {
        operationStatus: readOperationStatus,
      } as ProductOperationCoordinator,
      undefined,
      readAccountReadiness,
    ),
  )
  const server = createServer(app)
  await listen(server)
  const address = server.address() as AddressInfo
  try {
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function listen(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
}
