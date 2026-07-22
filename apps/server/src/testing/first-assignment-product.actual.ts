import assert from 'node:assert/strict'
import { mkdir, readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import { startExactProductLocalProviderFixture } from '@ay-ple/codex-chat-runtime/testing'
import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  decodeProductBootstrap,
  decodeProductError,
  decodeProductOperationFrame,
  decodeProductReviewResponse,
  decodeProductWorkspaceActivationResponse,
  decodeProductWorkspaceResponse,
  type ProductOperationFrame,
  type ReadyProductWorkspace,
} from '@ay-ple/product-contract'

import {
  materializeE2eSemesterWorkspace,
} from '../../../../scripts/semester-workspace-materializer.mjs'
import {
  configuredBootstrap,
  postJson,
} from './codex-chat-test-support.js'
import { withTestServer } from './test-server.js'

const selectedRelativePaths = [
  'lms-outline-notice.txt',
  'problem-solving-syllabus.txt',
] as const
const unselectedRelativePath = 'unselected-control.txt'
const revisionFeedback = '제안 설명을 더 명확하게 작성해 주세요.'

test(
  'completes revision and acceptance through the exact local provider',
  { timeout: 120_000 },
  async () => {
    const materialized = await materializeE2eSemesterWorkspace()
    const packageRoot = path.join(materialized.runRoot, 'package')
    const appDataRoot = path.join(materialized.runRoot, 'app-data')
    await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
    const sourceBytes = new Map(
      await Promise.all(
        [...selectedRelativePaths, unselectedRelativePath].map(
          async (relativePath) => [
            relativePath,
            await readFile(path.join(materialized.workspaceRoot, relativePath)),
          ] as const,
        ),
      ),
    )
    let fixture:
      | Awaited<ReturnType<typeof startExactProductLocalProviderFixture>>
      | undefined

    try {
      fixture = await startExactProductLocalProviderFixture({
        activeWorkspace: materialized.workspaceRoot,
        managedAppDataRoot: appDataRoot,
      })
      const activeFixture = fixture
      const runtimeWorkspace = await realpath(activeFixture.runtimeWorkspace)
      const activeWorkspace = await realpath(materialized.workspaceRoot)
      assert.notEqual(runtimeWorkspace, activeWorkspace)

      try {
        await withTestServer({
          codexChat: configuredBootstrap(activeFixture.runtime),
          semesterWorkspace: {
            appDataRoot,
            packageRoot,
            chooseDirectory: async () => materialized.workspaceRoot,
          },
        }, async (baseUrl) => {
          const workspace = await activateAndCreateCourse(baseUrl)
          const selected = selectedRelativePaths.map((relativePath) => {
            const material = requireMaterial(workspace, relativePath)
            return { id: material.id, digest: material.digest }
          })
          const unselected = requireMaterial(
            workspace,
            unselectedRelativePath,
          )

          const actionResponse = await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            {
              courseId: workspace.course!.id,
              recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
              arguments: FIRST_ASSIGNMENT_ARGUMENTS,
              materials: selected,
            },
          )
          assert.equal(actionResponse.status, 200)
          assert.equal(
            actionResponse.headers.get('content-type'),
            'application/x-ndjson',
          )
          const reader = actionResponse.body?.getReader()
          assert.ok(reader)
          const trace = new ProductNdjsonTrace(reader)
          const review = await trace.until(
            (frame) => frame.type === 'review.requested',
          )
          assert.equal(review.type, 'review.requested')
          assert.equal(review.patch.status, 'pending')
          assert.deepEqual(review.patch.changes, {
            operation: 'assignment.upsert',
            values: {
              title: '개요 작성하기',
              dueAt: '2026-07-12T23:59:00+09:00',
              submissionMethod: 'LMS 과제함 업로드',
            },
          })
          assert.deepEqual(
            new Set(review.patch.evidence.map((evidence) => evidence.rawMaterialId)),
            new Set(selected.map((material) => material.id)),
          )

          const beforeReviewResponse = await fetch(
            `${baseUrl}/api/product/bootstrap`,
          )
          assert.equal(beforeReviewResponse.status, 200)
          const beforeReview = decodeProductBootstrap(
            await beforeReviewResponse.json(),
          )
          assert.equal(beforeReview.operationStatus, 'active')
          assert.equal(beforeReview.workspace?.state, 'ready')
          if (beforeReview.workspace?.state !== 'ready') {
            assert.fail('The product workspace must remain ready during Review.')
          }
          assert.equal(beforeReview.workspace.confirmedRevision, 0)
          assert.deepEqual(beforeReview.history.assignments, [])
          assert.deepEqual(beforeReview.history.statePatches, [])
          assert.deepEqual(beforeReview.history.userConfirmations, [])
          assert.deepEqual(beforeReview.history.modelingRuns, [])

          const revisionResponse = await postJson(
            `${baseUrl}/api/product/reviews/${review.interactionId}`,
            {
              patchId: review.patchId,
              decisionKey: review.decisionKey,
              decision: 'revise',
              feedback: revisionFeedback,
            },
          )
          assert.equal(revisionResponse.status, 200)
          assert.deepEqual(
            decodeProductReviewResponse(await revisionResponse.json()),
            {
              patchId: review.patchId,
              decisionKey: review.decisionKey,
              decision: 'revision_requested',
              outcome: 'replacement_pending',
              confirmedRevision: 0,
              replayed: false,
              continuation: 'continued',
            },
          )

          const replacement = await trace.until(
            (frame) =>
              frame.type === 'review.replaced' &&
              frame.replaces.interactionId === review.interactionId,
          )
          assert.equal(replacement.type, 'review.replaced')
          assert.deepEqual(replacement.replaces, {
            interactionId: review.interactionId,
            patchId: review.patchId,
            decisionKey: review.decisionKey,
          })
          assert.notEqual(replacement.interactionId, review.interactionId)
          assert.notEqual(replacement.patchId, review.patchId)
          assert.notEqual(replacement.decisionKey, review.decisionKey)
          assert.equal(replacement.patch.status, 'pending')
          assert.deepEqual(replacement.patch.changes, review.patch.changes)
          assert.deepEqual(replacement.patch.evidence, review.patch.evidence)

          const reviewResponse = await postJson(
            `${baseUrl}/api/product/reviews/${replacement.interactionId}`,
            {
              patchId: replacement.patchId,
              decisionKey: replacement.decisionKey,
              decision: 'accept',
            },
          )
          assert.equal(reviewResponse.status, 200)
          assert.deepEqual(
            decodeProductReviewResponse(await reviewResponse.json()),
            {
              patchId: replacement.patchId,
              decisionKey: replacement.decisionKey,
              decision: 'accepted',
              outcome: 'applied',
              confirmedRevision: 1,
              replayed: false,
              continuation: 'continued',
            },
          )

          const frames = await trace.rest()
          assertFrameOrder(frames, [
            'operation.preparing',
            'operation.accepted',
            'skill.requested',
            'mcp_call.started',
            'mcp_call.completed',
            'plan.delta',
            'plan.completed',
            'review.requested',
            'review.resolved',
            'mcp_call.started',
            'mcp_call.completed',
            'plan.delta',
            'plan.completed',
            'review.replaced',
            'review.resolved',
            'agent_message.completed',
            'operation.terminal',
          ])
          assert.equal(
            frames.some(
              (frame) =>
                frame.type === 'skill.requested' &&
                frame.skill.name === 'ay-ple-first-assignment' &&
                frame.skill.version === FIRST_ASSIGNMENT_RECIPE_VERSION,
            ),
            true,
          )
          assert.equal(
            frames.some(
              (frame) =>
                frame.type === 'mcp_call.completed' &&
                frame.tool === 'propose_state_patch' &&
                frame.patch.id === replacement.patchId,
            ),
            true,
          )
          assert.equal(
            frames.some(
              (frame) =>
                frame.type === 'review.resolved' &&
                frame.interactionId === review.interactionId &&
                frame.outcome === 'revised',
            ),
            true,
          )
          assert.equal(
            frames.some(
              (frame) =>
                frame.type === 'review.resolved' &&
                frame.interactionId === replacement.interactionId &&
                frame.outcome === 'accepted',
            ),
            true,
          )
          const terminal = frames.at(-1)
          assert.ok(terminal)
          assert.equal(terminal.type, 'operation.terminal')
          if (terminal.type !== 'operation.terminal' || !('runId' in terminal)) {
            assert.fail('The Assignment operation must have a Run terminal.')
          }
          assert.equal(terminal.status, 'completed')
          assert.equal(terminal.validationOutcome, 'passed')

          const lateDuplicate = await postJson(
            `${baseUrl}/api/product/reviews/${replacement.interactionId}`,
            {
              patchId: replacement.patchId,
              decisionKey: replacement.decisionKey,
              decision: 'accept',
            },
          )
          assert.equal(lateDuplicate.status, 409)
          assert.equal(
            decodeProductError(await lateDuplicate.json()).code,
            'review_invalid',
          )

          const finalResponse = await fetch(`${baseUrl}/api/product/bootstrap`)
          assert.equal(finalResponse.status, 200)
          const finalBootstrap = decodeProductBootstrap(
            await finalResponse.json(),
          )
          assertFinalState(
            finalBootstrap,
            workspace,
            selected,
            terminal.runId,
            review.patchId,
            replacement.patchId,
          )

          const encodedFrames = JSON.stringify(frames)
          for (const managedPath of [
            materialized.workspaceRoot,
            runtimeWorkspace,
            packageRoot,
            appDataRoot,
            activeFixture.providerJournalPath,
          ]) {
            assert.equal(encodedFrames.includes(managedPath), false)
          }
          assert.equal(encodedFrames.includes(unselectedRelativePath), false)
          assert.equal(encodedFrames.includes(unselected.id), false)
          assert.equal(encodedFrames.includes(unselected.digest), false)
          assert.equal(encodedFrames.includes('최종 보고서'), false)
        })
      } catch (error) {
        const evidence = await activeFixture.readProviderEvidence()
        if (evidence.failureCode !== null) {
          throw new Error(
            `Exact product provider failed: ${evidence.failureCode}`,
            { cause: error },
          )
        }
        throw error
      }

      await activeFixture.closed
      assert.equal(processGroupExists(activeFixture.processGroupId), false)
      await activeFixture.waitForProviderRequests(6)
      const providerEvidence = await activeFixture.readProviderEvidence()
      assert.deepEqual(providerEvidence, {
        requestCount: 6,
        stages: [
          'exec_command',
          'mcp_proposal',
          'review_question',
          'replacement_mcp_proposal',
          'replacement_review_question',
          'terminal',
        ],
        managedSkillObserved: true,
        toolSurfaceObserved: true,
        activeWorkspaceCwdObserved: true,
        scratchWriteObserved: true,
        selectedSourcesRead: true,
        proposalCommittedOutputObserved: true,
        revisionRequestedOutputObserved: true,
        replacementProposalCommittedOutputObserved: true,
        reviewAcceptedOutputObserved: true,
        planResponseServed: true,
        replacementPlanResponseServed: true,
        terminalServed: true,
        failureCode: null,
      })
      const encodedEvidence = JSON.stringify(providerEvidence)
      assert.equal(encodedEvidence.includes(materialized.workspaceRoot), false)
      assert.equal(encodedEvidence.includes(appDataRoot), false)

      for (const [relativePath, before] of sourceBytes) {
        assert.deepEqual(
          await readFile(path.join(materialized.workspaceRoot, relativePath)),
          before,
        )
      }
    } finally {
      const cleanupResults = await Promise.allSettled([
        fixture?.dispose() ?? Promise.resolve(),
        materialized.cleanup(),
      ])
      const cleanupErrors = cleanupResults.flatMap((result) =>
        result.status === 'rejected' ? [result.reason] : [],
      )
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          'Exact product actual-test cleanup failed',
        )
      }
    }
  },
)

async function activateAndCreateCourse(
  baseUrl: string,
): Promise<ReadyProductWorkspace> {
  const activationResponse = await postJson(
    `${baseUrl}/api/product/workspaces/activate`,
    {},
  )
  assert.equal(activationResponse.status, 200)
  const activation = decodeProductWorkspaceActivationResponse(
    await activationResponse.json(),
  )
  assert.equal(activation.status, 'activated')
  assert.equal(activation.workspace?.state, 'ready')

  const courseResponse = await postJson(`${baseUrl}/api/product/courses`, {
    displayName: '문제해결글쓰기',
  })
  assert.equal(courseResponse.status, 201)
  const created = decodeProductWorkspaceResponse(await courseResponse.json())
  assert.ok(created.workspace.course)
  return created.workspace
}

function requireMaterial(
  workspace: ReadyProductWorkspace,
  relativePath: string,
): ReadyProductWorkspace['materials'][number] {
  const material = workspace.materials.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  assert.ok(material)
  return material
}

function assertFinalState(
  bootstrap: ReturnType<typeof decodeProductBootstrap>,
  initialWorkspace: ReadyProductWorkspace,
  selected: readonly { readonly id: string; readonly digest: string }[],
  runId: string,
  originalPatchId: string,
  replacementPatchId: string,
): void {
  assert.equal(bootstrap.operationStatus, 'idle')
  assert.equal(bootstrap.workspace?.state, 'ready')
  if (bootstrap.workspace?.state !== 'ready') {
    assert.fail('The final product workspace must be ready.')
  }
  assert.equal(bootstrap.workspace.confirmedRevision, 1)
  assert.equal(bootstrap.workspace.course?.id, initialWorkspace.course?.id)

  assert.equal(bootstrap.history.assignments.length, 1)
  const assignment = bootstrap.history.assignments[0]
  assert.ok(assignment)
  assert.equal(assignment.courseId, initialWorkspace.course?.id)
  assert.equal(assignment.title, '개요 작성하기')
  assert.equal(assignment.dueAt, '2026-07-12T23:59:00+09:00')
  assert.equal(assignment.submissionMethod, 'LMS 과제함 업로드')
  assert.deepEqual(
    new Set(assignment.evidence.map((evidence) => evidence.materialId)),
    new Set(selected.map((material) => material.id)),
  )

  assert.equal(bootstrap.history.statePatches.length, 2)
  const originalPatch = bootstrap.history.statePatches.find(
    (patch) => patch.id === originalPatchId,
  )
  assert.ok(originalPatch)
  assert.equal(originalPatch.status, 'superseded')
  assert.equal(originalPatch.applyOutcome, null)
  const replacementPatch = bootstrap.history.statePatches.find(
    (patch) => patch.id === replacementPatchId,
  )
  assert.ok(replacementPatch)
  assert.equal(replacementPatch.status, 'applied')
  assert.deepEqual(replacementPatch.applyOutcome, {
    type: 'applied',
    assignmentId: assignment.id,
    resultingRevision: 1,
  })

  assert.equal(bootstrap.history.userConfirmations.length, 1)
  const confirmation = bootstrap.history.userConfirmations[0]
  assert.ok(confirmation)
  assert.equal(confirmation.patchId, replacementPatch.id)
  assert.equal(confirmation.decision, 'accepted')
  assert.equal(confirmation.outcome, 'applied')
  assert.equal(confirmation.assignmentId, assignment.id)
  assert.equal(confirmation.resultingRevision, 1)

  assert.equal(bootstrap.history.modelingRuns.length, 1)
  const run = bootstrap.history.modelingRuns[0]
  assert.ok(run)
  assert.equal(run.id, runId)
  assert.equal(run.status, 'completed')
  assert.equal(run.validationOutcome, 'passed')
  assert.equal(run.recovery, null)
  assert.deepEqual(run.recipe, {
    name: 'first-assignment',
    version: FIRST_ASSIGNMENT_RECIPE_VERSION,
    requestedSkillName: 'ay-ple-first-assignment',
  })
  assert.deepEqual(
    new Set(run.sources.map((source) => source.materialId)),
    new Set(selected.map((material) => material.id)),
  )
  assert.deepEqual(
    new Set(run.sources.map((source) => source.digest)),
    new Set(selected.map((material) => material.digest)),
  )
}

function assertFrameOrder(
  frames: readonly ProductOperationFrame[],
  expected: readonly ProductOperationFrame['type'][],
): void {
  let cursor = -1
  for (const type of expected) {
    cursor = frames.findIndex(
      (frame, index) => index > cursor && frame.type === type,
    )
    assert.notEqual(cursor, -1, `Missing ordered product frame: ${type}`)
  }
}

class ProductNdjsonTrace {
  private readonly frames: ProductOperationFrame[] = []
  private readonly decoder = new TextDecoder()
  private buffer = ''
  private done = false

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {}

  async until(
    predicate: (frame: ProductOperationFrame) => boolean,
  ): Promise<ProductOperationFrame> {
    while (true) {
      const existing = this.frames.find(predicate)
      if (existing) return existing
      await this.readNext()
      if (this.done) {
        throw new Error(
          `NDJSON stream ended before the target frame: ${JSON.stringify(this.frames)}`,
        )
      }
    }
  }

  async rest(): Promise<readonly ProductOperationFrame[]> {
    while (!this.done) await this.readNext()
    return this.frames
  }

  private async readNext(): Promise<void> {
    const chunk = await this.reader.read()
    if (chunk.done) {
      this.done = true
      this.buffer += this.decoder.decode()
      this.flushLines(true)
      return
    }
    this.buffer += this.decoder.decode(chunk.value, { stream: true })
    this.flushLines(false)
  }

  private flushLines(includeRemainder: boolean): void {
    const lines = this.buffer.split('\n')
    this.buffer = includeRemainder ? '' : (lines.pop() ?? '')
    for (const line of lines) {
      if (line.trim().length > 0) {
        this.frames.push(
          decodeProductOperationFrame(JSON.parse(line) as unknown),
        )
      }
    }
  }
}

function processGroupExists(processGroupId: number): boolean {
  try {
    process.kill(-processGroupId, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}
