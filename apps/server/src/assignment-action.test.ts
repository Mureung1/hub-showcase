import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import {
  type AnswerUserInput,
  type CancelUserInput,
  type CodexAccountReadiness,
  type CodexChatRuntimeError,
  type CodexProductActivity,
  type CodexProductCapableRuntime,
  type CodexProductTurn,
  type InterruptTurnInput,
  type ReleaseThreadInput,
  type StartProductTurnInput,
  type StartThreadInput,
  type StartTurnInput,
} from '@ay-ple/codex-chat-runtime'
import { DeterministicCodexProductRuntime } from '@ay-ple/codex-chat-runtime/testing'
import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  decodeProductOperationFrame,
} from '@ay-ple/product-contract'

import {
  configuredBootstrap,
  postJson,
  waitFor,
} from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'
import { StatePatchReviewError } from './semester-workspace.js'
import { materializeE2eSemesterWorkspace } from '../../../scripts/semester-workspace-materializer.mjs'

test('account-not-ready rejects the Assignment action before a Run or native start', async () => {
  const fixture = await createActionFixture()
  const runtime = new DeterministicCodexProductRuntime({
    accountReadiness: [
      { state: 'not_ready', reason: 'authentication_required' },
    ],
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )

        assert.equal(response.status, 409)
        assert.deepEqual(await response.json(), {
          code: 'account_not_ready',
          displayMessage: 'Codex에 로그인한 뒤 다시 시도해 주세요.',
        })
        assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
        assert.deepEqual(runtime.calls, [
          { operation: 'readAccountReadiness' },
        ])
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('registered source drift interrupts the native Turn and opens workspace recovery', async () => {
  const fixture = await createActionFixture()
  const driftedBytes = Buffer.from('학생이 실행 중 수정한 LMS 공지', 'utf8')
  const driftedPath = path.join(
    fixture.workspaceRoot,
    'lms-outline-notice.txt',
  )
  const runtime = new HttpMcpProductRuntime({
    beforeProposal: () => writeFile(driftedPath, driftedBytes),
    proposalFails: true,
    onStartProductTurn: async () => undefined,
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) =>
          validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )

        const frames = await readProductFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            actionRequest(workspace.course!.id, selected),
          ),
        )

        assert.equal(runtime.interruptCalls, 1)
        assert.equal(
          frames.some((frame) => frame.type === 'mcp_call.failed'),
          true,
        )
        const terminal = frames.at(-1)
        assert.equal(terminal?.type, 'operation.terminal')
        assert.equal(terminal?.status, 'failed')
        assert.equal(terminal?.failureCode, 'execution_guard_conflict')
        assert.deepEqual(await readFile(driftedPath), driftedBytes)

        const bootstrap = (await (
          await fetch(`${baseUrl}/api/product/bootstrap`)
        ).json()) as {
          readonly workspace: {
            readonly recovery: {
              readonly state: string
              readonly displayMessage: string
            } | null
          }
        }
        assert.equal(bootstrap.workspace.recovery?.state, 'source_conflict')
        assert.equal(
          bootstrap.workspace.recovery?.displayMessage,
          '원본 자료가 실행 중 변경되었습니다. 자료 새로고침으로 현재 내용을 새 기준으로 채택하세요.',
        )
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('released Assignment store conflict can reactivate the current valid store in the same Server session', async () => {
  const fixture = await createActionFixture()
  const storePath = path.join(
    fixture.workspaceRoot,
    '.ay-ple',
    'workspace-state.json',
  )
  let externalBytes = Buffer.alloc(0)
  const runtime = new HttpMcpProductRuntime({
    beforeProposal: async () => {
      const externalStore = JSON.parse(
        await readFile(storePath, 'utf8'),
      ) as Record<string, unknown>
      externalStore.course = {
        ...(externalStore.course as Record<string, unknown>),
        displayName: '외부에서 복구한 문제해결글쓰기',
      }
      externalBytes = Buffer.from(
        `${JSON.stringify(externalStore, null, 2)}\n`,
        'utf8',
      )
      await writeFile(storePath, externalBytes)
    },
    proposalFails: true,
    onStartProductTurn: async () => undefined,
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) =>
          validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )

        const frames = await readProductFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            actionRequest(workspace.course!.id, selected),
          ),
        )

        assert.equal(frames.at(-1)?.failureCode, 'execution_guard_conflict')
        assert.deepEqual(await readFile(storePath), externalBytes)
        const conflicted = application.semesterWorkspace?.snapshot()
        assert.equal(conflicted?.state, 'ready')
        if (conflicted?.state !== 'ready') assert.fail('workspace must be ready')
        assert.equal(conflicted.recovery?.state, 'store_conflict')
        const publicConflict = (await (
          await fetch(`${baseUrl}/api/product/bootstrap`)
        ).json()) as {
          readonly workspace: {
            readonly recovery: {
              readonly state: string
              readonly displayMessage: string
            } | null
          }
        }
        assert.deepEqual(publicConflict.workspace.recovery, {
          state: 'store_conflict',
          displayMessage:
            '학기 상태 파일이 외부에서 변경되었습니다. 현재 bytes를 보존했으며 작업공간을 다시 선택해 확인하세요.',
        })

        const activationResponse = await postJson(
          `${baseUrl}/api/product/workspaces/activate`,
          {},
        )
        assert.equal(activationResponse.status, 200)
        const activation = (await activationResponse.json()) as {
          readonly status: string
          readonly workspace: {
            readonly state: string
            readonly course: { readonly displayName: string } | null
            readonly recovery: { readonly state: string } | null
          }
        }
        assert.equal(activation.status, 'activated')
        assert.equal(activation.workspace.state, 'ready')
        assert.equal(
          activation.workspace.course?.displayName,
          '외부에서 복구한 문제해결글쓰기',
        )
        assert.equal(activation.workspace.recovery, null)
        const reconciledRuns =
          application.semesterWorkspace?.modelingRuns() ?? []
        assert.equal(reconciledRuns.length, 1)
        assert.equal(reconciledRuns[0]?.status, 'unknown')
        assert.equal(reconciledRuns[0]?.validationOutcome, 'unknown')
        assert.equal(
          reconciledRuns[0]?.failureCode,
          'reconciled_after_restart',
        )
        const persisted = JSON.parse(
          await readFile(storePath, 'utf8'),
        ) as { readonly executionGuard: unknown }
        assert.equal(persisted.executionGuard, null)
        assert.equal(
          (await application.semesterWorkspace?.refreshMaterials())?.outcome,
          'refreshed',
        )
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('accepted product authority survives a cancelled native Review continuation', async () => {
  const fixture = await createActionFixture()
  let applicationRef:
    | Parameters<Parameters<typeof withTestServer>[1]>[1]
    | undefined
  const runtime = new HttpMcpProductRuntime({
    reviewResolution: 'cancelled',
    onStartProductTurn: async (input) => {
      const runs = applicationRef?.semesterWorkspace?.modelingRuns() ?? []
      assert.equal(runs.length, 1)
      assert.equal(runs[0]?.status, 'starting')
      assert.equal(input.skill?.name, 'ay-ple-first-assignment')
      assert.match(input.skill?.path ?? '', /\/SKILL\.md$/)
      assert.equal('plan' in input, false)
      assert.equal(input.text.includes('unselected-control.txt'), false)
      assert.equal(input.text.includes('최종 보고서'), false)
    },
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        applicationRef = application
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) => {
          const proposal = validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )
          proposal.summary = `선택 자료 제안 ${fixture.workspaceRoot} ${runtime.mcpToken ?? ''}`
          return proposal
        }

        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(response.status, 200)
        assert.equal(
          response.headers.get('content-type'),
          'application/x-ndjson',
        )
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const review = await trace.until(
          (frame) => frame.type === 'review.requested',
        )
        assert.match(String(review.interactionId), /^interaction-/)
        assert.match(String(review.patchId), /^patch_[0-9a-f]{32}$/)
        assert.match(String(review.decisionKey), /^decision_[0-9a-f]{32}$/)
        assert.equal(
          (review.questions as { readonly id: string }[])[0]?.id,
          'assignment_review_decision',
        )

        const reviewResponse = await postJson(
          `${baseUrl}/api/product/reviews/${review.interactionId}`,
          {
            patchId: review.patchId,
            decisionKey: review.decisionKey,
            decision: 'accept',
          },
        )
        assert.equal(reviewResponse.status, 200)
        assert.deepEqual(await reviewResponse.json(), {
          patchId: review.patchId,
          decisionKey: review.decisionKey,
          decision: 'accepted',
          outcome: 'applied',
          confirmedRevision: 1,
          replayed: false,
          continuation: 'continued',
        })

        const frames = await trace.rest()
        assert.deepEqual(
          frames.map((frame) => frame.type),
          [
            'operation.preparing',
            'operation.accepted',
            'skill.requested',
            'interaction.requested',
            'interaction.resolved',
            'plan.delta',
            'plan.completed',
            'mcp_call.started',
            'mcp_call.completed',
            'review.requested',
            'review.resolved',
            'agent_message.delta',
            'agent_message.completed',
            'operation.terminal',
          ],
        )
        assert.equal(
          frames.find(
            (frame) =>
              frame.type === 'review.resolved' &&
              frame.interactionId === review.interactionId,
          )?.outcome,
          'accepted',
        )
        assert.equal(frames.at(-1)?.status, 'completed')
        assert.equal(frames.at(-1)?.validationOutcome, 'passed')
        const runId = frames[0]?.runId
        assert.match(String(runId), /^run_[0-9a-f]{32}$/)
        assert.equal(frames[1]?.runId, runId)
        assert.equal(frames.at(-1)?.runId, runId)
        const encodedTrace = JSON.stringify(frames)
        assert.equal(encodedTrace.includes(fixture.bootstrap.appDataRoot), false)
        assert.equal(encodedTrace.includes(fixture.workspaceRoot), false)
        assert.equal(encodedTrace.includes('thread-native-A'), false)
        assert.equal(encodedTrace.includes('turn-native-A'), false)
        assert.ok(runtime.mcpToken)
        assert.equal(encodedTrace.includes(runtime.mcpToken), false)

        const genericRequest = frames.find(
          (frame) => frame.type === 'interaction.requested',
        )
        const genericResolved = frames.find(
          (frame) => frame.type === 'interaction.resolved',
        )
        assert.ok(genericRequest)
        assert.ok(genericResolved)
        assert.match(
          String(genericRequest.interactionId),
          /^interaction_[0-9a-f]{32}$/,
        )
        assert.equal(
          genericResolved.interactionId,
          genericRequest.interactionId,
        )
        const genericQuestion = (
          genericRequest.questions as {
            readonly id: string
            readonly header: string
          }[]
        )[0]
        assert.ok(genericQuestion)
        assert.match(genericQuestion.id, /^question_[0-9a-f]{32}$/)
        assert.match(genericQuestion.header, /\[managed path\]/)

        for (const activityType of ['plan', 'agent_message'] as const) {
          const delta = frames.find(
            (frame) => frame.type === `${activityType}.delta`,
          )
          const completed = frames.find(
            (frame) => frame.type === `${activityType}.completed`,
          )
          assert.ok(delta)
          assert.ok(completed)
          assert.match(String(delta.activityId), /^activity_[0-9a-f]{32}$/)
          assert.equal(delta.activityId, completed.activityId)
          const deltaText = String(delta.delta)
          assert.match(deltaText, /\[managed path\]/)
          assert.equal(deltaText.includes('\ufffd'), false)
          assert.equal(
            Buffer.byteLength(deltaText, 'utf8') <= 128 * 1024,
            true,
            `delta bytes: ${Buffer.byteLength(deltaText, 'utf8')}`,
          )
        }

        assert.equal(runtime.productInputs.length, 1)
        assert.equal(runtime.snapshotBytes.length, 2)
        assert.deepEqual(
          runtime.snapshotBytes,
          await Promise.all(
            [
              'lms-outline-notice.txt',
              'problem-solving-syllabus.txt',
            ].map((file) => readFile(path.join(fixture.workspaceRoot, file))),
          ),
        )
        const runs = application.semesterWorkspace?.modelingRuns() ?? []
        assert.equal(runs.length, 1)
        assert.equal(runs[0]?.status, 'completed')
        assert.equal(runs[0]?.validationOutcome, 'passed')
        assert.equal(runs[0]?.nativeCorrelation?.threadId, 'thread-native-A')
        const state = application.semesterWorkspace?.assignmentState()
        assert.equal(state?.assignments.length, 1)
        assert.equal(state?.statePatches[0]?.status, 'applied')
        assert.equal(state?.userConfirmations.length, 1)
        assert.equal(state?.userConfirmations[0]?.decision, 'accepted')
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('an accepted commit reports lost continuation without reapplying after native answer failure', async () => {
  const fixture = await createActionFixture()
  const runtime = new HttpMcpProductRuntime({
    failReviewAnswer: true,
    onStartProductTurn: async () => undefined,
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) =>
          validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )

        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const review = await trace.until(
          (frame) => frame.type === 'review.requested',
        )
        const decision = {
          patchId: review.patchId,
          decisionKey: review.decisionKey,
          decision: 'accept',
        }

        const reviewResponse = await postJson(
          `${baseUrl}/api/product/reviews/${review.interactionId}`,
          decision,
        )
        const reviewStatus = reviewResponse.status
        const reviewBody = await reviewResponse.json()
        const frames = await trace.rest()

        assert.equal(reviewStatus, 200)
        assert.deepEqual(reviewBody, {
          patchId: review.patchId,
          decisionKey: review.decisionKey,
          decision: 'accepted',
          outcome: 'applied',
          confirmedRevision: 1,
          replayed: false,
          continuation: 'lost',
        })

        const recovery = frames.find(
          (frame) => frame.type === 'operation.recovery',
        )
        assert.deepEqual(recovery, {
          type: 'operation.recovery',
          operationId: frames[0]?.operationId,
          runId: frames[0]?.runId,
          outcome: 'continuation_lost',
          retryable: false,
          confirmedRevision: 1,
        })
        assert.equal(frames.at(-1)?.type, 'operation.terminal')
        assert.equal(frames.at(-1)?.status, 'unknown')

        const stateAfterLoss = application.semesterWorkspace?.assignmentState()
        assert.equal(stateAfterLoss?.confirmedRevision, 1)
        assert.equal(stateAfterLoss?.assignments.length, 1)
        assert.equal(stateAfterLoss?.statePatches[0]?.status, 'applied')
        assert.equal(stateAfterLoss?.userConfirmations.length, 1)
        assert.equal(runtime.answerInputs.length, 1)

        const lateDuplicate = await postJson(
          `${baseUrl}/api/product/reviews/${review.interactionId}`,
          decision,
        )
        assert.equal(lateDuplicate.status, 409)
        const stateAfterDuplicate =
          application.semesterWorkspace?.assignmentState()
        assert.deepEqual(stateAfterDuplicate, stateAfterLoss)
        assert.equal(runtime.answerInputs.length, 1)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('revision feedback rotates the private MCP session, replaces the Review, and accepts the replacement exactly once', async () => {
  const fixture = await createActionFixture()
  const runtime = new RevisionHttpMcpProductRuntime()

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) =>
          validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )

        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const original = await trace.until(
          (frame) => frame.type === 'review.requested',
        )

        const wrongBinding = await postJson(
          `${baseUrl}/api/product/reviews/${original.interactionId}`,
          {
            patchId: 'patch_00000000000000000000000000000000',
            decisionKey: original.decisionKey,
            decision: 'revise',
            feedback: '제출 방식에 보고서도 포함해 주세요.',
          },
        )
        assert.equal(wrongBinding.status, 409)
        assert.deepEqual(await wrongBinding.json(), {
          code: 'review_invalid',
          displayMessage: '변경 제안 또는 검토 상태를 확인해 주세요.',
        })

        const revisionInput = {
          patchId: original.patchId,
          decisionKey: original.decisionKey,
          decision: 'revise',
          feedback: '제출 방식에 보고서도 포함해 주세요.',
        }
        const firstRevision = postJson(
          `${baseUrl}/api/product/reviews/${original.interactionId}`,
          revisionInput,
        )
        const duplicateRevision = postJson(
          `${baseUrl}/api/product/reviews/${original.interactionId}`,
          revisionInput,
        )
        const revisionResponses = await Promise.all([
          firstRevision,
          duplicateRevision,
        ])
        assert.deepEqual(
          revisionResponses.map((candidate) => candidate.status),
          [200, 200],
        )
        const revisionBodies = await Promise.all(
          revisionResponses.map(async (candidate) => candidate.json()),
        )
        for (const body of revisionBodies) {
          assert.deepEqual(body, {
            patchId: original.patchId,
            decisionKey: original.decisionKey,
            decision: 'revision_requested',
            outcome: 'replacement_pending',
            confirmedRevision: 0,
            replayed: body.replayed,
            continuation: 'continued',
          })
        }
        assert.deepEqual(
          revisionBodies.map((body) => body.replayed).sort(),
          [false, true],
        )
        assert.equal(runtime.answerInputs.length, 1)
        assert.ok(runtime.replacementRequestKey)
        assert.notEqual(
          runtime.replacementRequestKey,
          runtime.originalRequestKey,
        )

        const lateAccept = await postJson(
          `${baseUrl}/api/product/reviews/${original.interactionId}`,
          {
            patchId: original.patchId,
            decisionKey: original.decisionKey,
            decision: 'accept',
          },
        )
        assert.equal(lateAccept.status, 409)
        assert.deepEqual(await lateAccept.json(), {
          code: 'review_invalid',
          displayMessage: '검토 응답이 이전 요청과 일치하지 않습니다.',
        })

        const replacement = await trace.until(
          (frame) => frame.type === 'review.replaced',
        )
        assert.deepEqual(replacement.replaces, {
          interactionId: original.interactionId,
          patchId: original.patchId,
          decisionKey: original.decisionKey,
        })
        assert.notEqual(replacement.interactionId, original.interactionId)
        assert.notEqual(replacement.patchId, original.patchId)
        assert.notEqual(replacement.decisionKey, original.decisionKey)

        const acceptReplacement = await postJson(
          `${baseUrl}/api/product/reviews/${replacement.interactionId}`,
          {
            patchId: replacement.patchId,
            decisionKey: replacement.decisionKey,
            decision: 'accept',
          },
        )
        assert.equal(acceptReplacement.status, 200)
        assert.deepEqual(await acceptReplacement.json(), {
          patchId: replacement.patchId,
          decisionKey: replacement.decisionKey,
          decision: 'accepted',
          outcome: 'applied',
          confirmedRevision: 1,
          replayed: false,
          continuation: 'continued',
        })

        const frames = await trace.rest()
        const oldResolvedIndex = frames.findIndex(
          (frame) =>
            frame.type === 'review.resolved' &&
            frame.interactionId === original.interactionId,
        )
        const replacementIndex = frames.findIndex(
          (frame) => frame.type === 'review.replaced',
        )
        assert.ok(oldResolvedIndex >= 0)
        assert.ok(replacementIndex > oldResolvedIndex)
        assert.equal(frames[oldResolvedIndex]?.outcome, 'revised')
        const replacementResolved = frames.find(
          (frame) =>
            frame.type === 'review.resolved' &&
            frame.interactionId === replacement.interactionId,
        )
        assert.equal(replacementResolved?.outcome, 'accepted')
        assert.equal(
          JSON.stringify(frames).includes(runtime.replacementRequestKey!),
          false,
        )
        assert.equal(runtime.answerInputs.length, 2)

        const state = application.semesterWorkspace?.assignmentState()
        assert.equal(state?.confirmedRevision, 1)
        assert.equal(state?.assignments.length, 1)
        assert.deepEqual(
          state?.statePatches.map((patch) => patch.status),
          ['superseded', 'applied'],
        )
        assert.equal(state?.userConfirmations.length, 1)
        assert.equal(
          state?.userConfirmations[0]?.patchId,
          replacement.patchId,
        )
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('cancelled revision continuation remains cancelled and interrupts the original patch at terminal', async () => {
  const fixture = await createActionFixture()
  const runtime = new RevisionHttpMcpProductRuntime({
    cancelRevisionResolution: true,
    terminateAfterRevision: true,
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) =>
          validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )

        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const review = await trace.until(
          (frame) => frame.type === 'review.requested',
        )
        const revision = await postJson(
          `${baseUrl}/api/product/reviews/${review.interactionId}`,
          {
            patchId: review.patchId,
            decisionKey: review.decisionKey,
            decision: 'revise',
            feedback: '마감 근거를 다시 확인해 주세요.',
          },
        )
        assert.equal(revision.status, 200)
        assert.equal((await revision.json()).decision, 'revision_requested')

        const frames = await trace.rest()
        assert.equal(
          frames.find(
            (frame) =>
              frame.type === 'review.resolved' &&
              frame.interactionId === review.interactionId,
          )?.outcome,
          'cancelled',
        )
        assert.equal(
          frames.some((frame) => frame.type === 'review.replaced'),
          false,
        )
        const state = application.semesterWorkspace?.assignmentState()
        assert.equal(state?.confirmedRevision, 0)
        assert.deepEqual(state?.assignments, [])
        assert.deepEqual(state?.userConfirmations, [])
        assert.equal(state?.statePatches.length, 1)
        assert.equal(state?.statePatches[0]?.id, review.patchId)
        assert.equal(state?.statePatches[0]?.status, 'interrupted')
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('concurrent duplicate revision failures both map through the safe public 409 boundary', async () => {
  const fixture = await createActionFixture()
  const runtime = new RevisionHttpMcpProductRuntime({
    failRevisionAnswer: true,
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) =>
          validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )

        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const review = await trace.until(
          (frame) => frame.type === 'review.requested',
        )
        const input = {
          patchId: review.patchId,
          decisionKey: review.decisionKey,
          decision: 'revise',
          feedback: '근거를 다시 확인해 주세요.',
        }
        const first = postJson(
          `${baseUrl}/api/product/reviews/${review.interactionId}`,
          input,
        )
        await runtime.revisionAnswerStarted.promise
        const duplicate = postJson(
          `${baseUrl}/api/product/reviews/${review.interactionId}`,
          input,
        )
        await new Promise((resolve) => setTimeout(resolve, 20))
        runtime.rejectRevisionAnswer()
        const failures = await Promise.all([first, duplicate])

        assert.deepEqual(
          failures.map((failure) => failure.status),
          [409, 409],
        )
        assert.deepEqual(
          await Promise.all(failures.map((failure) => failure.json())),
          [
            {
              code: 'review_invalid',
              displayMessage: '변경 제안 또는 검토 상태를 확인해 주세요.',
            },
            {
              code: 'review_invalid',
              displayMessage: '변경 제안 또는 검토 상태를 확인해 주세요.',
            },
          ],
        )
        assert.equal(runtime.answerInputs.length, 1)
        await trace.rest()
        await waitFor(
          () =>
            application.semesterWorkspace?.modelingRuns()[0]?.status !==
            'running',
        )
        const state = application.semesterWorkspace?.assignmentState()
        assert.equal(state?.confirmedRevision, 0)
        assert.deepEqual(state?.assignments, [])
        assert.deepEqual(state?.userConfirmations, [])
        assert.equal(state?.statePatches[0]?.status, 'interrupted')
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('rejected product authority survives a cancelled native Review continuation without applying state', async () => {
  const fixture = await createActionFixture()
  const runtime = new HttpMcpProductRuntime({
    reviewResolution: 'cancelled',
    onStartProductTurn: async () => undefined,
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        runtime.proposal = (input) =>
          validProposalFromProductInput(
            input,
            workspace.course!.id,
            selected,
          )

        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const review = await trace.until(
          (frame) => frame.type === 'review.requested',
        )
        const rejection = await postJson(
          `${baseUrl}/api/product/reviews/${review.interactionId}`,
          {
            patchId: review.patchId,
            decisionKey: review.decisionKey,
            decision: 'reject',
          },
        )

        assert.equal(rejection.status, 200)
        assert.deepEqual(await rejection.json(), {
          patchId: review.patchId,
          decisionKey: review.decisionKey,
          decision: 'rejected',
          outcome: 'not_applied',
          confirmedRevision: 0,
          replayed: false,
          continuation: 'continued',
        })
        const frames = await trace.rest()
        assert.equal(
          frames.find(
            (frame) =>
              frame.type === 'review.resolved' &&
              frame.interactionId === review.interactionId,
          )?.outcome,
          'rejected',
        )
        assert.deepEqual(runtime.answerInputs, [
          {
            interactionId: review.interactionId,
            answers: { assignment_review_decision: ['거절'] },
          },
        ])
        const state = application.semesterWorkspace?.assignmentState()
        assert.equal(state?.confirmedRevision, 0)
        assert.deepEqual(state?.assignments, [])
        assert.equal(state?.statePatches[0]?.status, 'rejected')
        assert.deepEqual(
          state?.userConfirmations.map((confirmation) => ({
            patchId: confirmation.patchId,
            decision: confirmation.decision,
            outcome: confirmation.outcome,
          })),
          [
            {
              patchId: review.patchId,
              decision: 'rejected',
              outcome: 'not_applied',
            },
          ],
        )
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

type MaterialSelection = {
  readonly id: string
  readonly digest: string
}

function actionRequest(
  courseId: string,
  materials: readonly MaterialSelection[],
): Record<string, unknown> {
  return {
    courseId,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials,
  }
}

async function createActionFixture() {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
  return {
    bootstrap: {
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    },
    workspaceRoot: materialized.workspaceRoot,
    cleanup: materialized.cleanup,
  }
}

async function activateCourse(application: {
  readonly semesterWorkspace?: {
    activate(): Promise<{
      readonly status: 'activated' | 'cancelled'
    }>
    createCourse(displayName: string): Promise<{
      readonly course: { readonly id: string } | null
      readonly materials: readonly {
        readonly id: string
        readonly relativePath: string
        readonly digest: string
      }[]
    }>
  }
}) {
  const activation = await application.semesterWorkspace?.activate()
  assert.equal(activation?.status, 'activated')
  const workspace = await application.semesterWorkspace?.createCourse(
    '문제해결글쓰기',
  )
  assert.ok(workspace?.course)
  return workspace
}

function selectCanonicalMaterials(
  materials: readonly {
    readonly id: string
    readonly relativePath: string
    readonly digest: string
  }[],
): readonly MaterialSelection[] {
  return [
    requireMaterial(materials, 'lms-outline-notice.txt'),
    requireMaterial(materials, 'problem-solving-syllabus.txt'),
  ].map((material) => ({ id: material.id, digest: material.digest }))
}

async function readProductFrames(
  response: Response,
): Promise<Record<string, unknown>[]> {
  assert.equal(response.status, 200)
  const reader = response.body?.getReader()
  assert.ok(reader)
  return new NdjsonTrace(reader).rest()
}

function requireMaterial(
  materials: readonly {
    readonly id: string
    readonly relativePath: string
    readonly digest: string
  }[],
  relativePath: string,
) {
  const material = materials.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  assert.ok(material)
  return material
}

function validProposalFromProductInput(
  input: StartProductTurnInput,
  courseId: string,
  selected: readonly MaterialSelection[],
): Record<string, unknown> {
  const requestKey = requireMatch(input.text, /requestKey: (proposal_[0-9a-f]{32})/)
  const workspaceId = requireMatch(
    input.text,
    /workspaceId: (workspace_[0-9a-f]{32})/,
  )
  const baseRevision = Number(requireMatch(input.text, /baseRevision: (\d+)/))
  return {
    requestKey,
    workspaceId,
    courseId,
    baseRevision,
    summary: '선택 자료에서 개요 작성 과제를 확인했습니다.',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '개요 작성하기',
        dueAt: '2026-07-12T23:59:00+09:00',
        submissionMethod: 'LMS 과제함 업로드',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: selected[1]!.id,
        digest: selected[1]!.digest,
        quote: '과제: 개요 작성하기',
      },
      {
        field: 'dueAt',
        rawMaterialId: selected[0]!.id,
        digest: selected[0]!.digest,
        quote: 'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
      },
      {
        field: 'submissionMethod',
        rawMaterialId: selected[1]!.id,
        digest: selected[1]!.digest,
        quote: '제출 방식: LMS 과제함 업로드',
      },
    ],
  }
}

function requireMatch(value: string, pattern: RegExp): string {
  const match = pattern.exec(value)?.[1]
  assert.ok(match)
  return match
}

type Deferred<T> = {
  readonly promise: Promise<T>
  resolve(value: T): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

const assignmentReviewQuestion = {
  id: 'assignment_review_decision',
  header: '변경 제안 검토',
  question: '이 Assignment 변경 제안을 어떻게 처리할까요?',
  options: [
    {
      label: '수락',
      description: '근거와 값을 확인하고 학기 상태에 반영합니다.',
    },
    {
      label: 'AY에게 수정 요청',
      description: '피드백을 전달하고 새 변경 제안을 기다립니다.',
    },
    {
      label: '거절',
      description: '제안을 반영하지 않고 결정 기록만 남깁니다.',
    },
  ],
  acceptsFreeform: true,
} as const

async function callAssignmentProposalTool(input: {
  readonly id: number
  readonly proposal: Record<string, unknown>
  readonly threadInput: StartThreadInput | undefined
  readonly expectError?: boolean
}): Promise<void> {
  assert.ok(input.threadInput)
  const response = await fetch(input.threadInput.mcp.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-ay-ple-mcp-token': input.threadInput.mcp.token,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: input.id,
      method: 'tools/call',
      params: {
        name: 'propose_state_patch',
        arguments: input.proposal,
      },
    }),
  })
  assert.equal(response.status, 200)
  const result = (await response.json()) as {
    readonly result?: { readonly isError?: boolean }
  }
  assert.equal(result.result?.isError, input.expectError ?? false)
}

class HttpMcpProductRuntime implements CodexProductCapableRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  readonly productInputs: StartProductTurnInput[] = []
  readonly snapshotBytes: Buffer[] = []
  readonly answerInputs: AnswerUserInput[] = []
  interruptCalls = 0
  mcpToken?: string
  proposal?: (input: StartProductTurnInput) => Record<string, unknown>
  private readonly onStartProductTurn: (
    input: StartProductTurnInput,
  ) => Promise<void>
  private readonly answer = deferred<void>()
  private readonly answerAcknowledged = deferred<void>()
  private readonly failReviewAnswer: boolean
  private readonly beforeProposal?: () => Promise<void>
  private readonly proposalFails: boolean
  private readonly reviewResolution: 'answered' | 'cancelled'
  private threadInput?: StartThreadInput

  constructor(options: {
    readonly onStartProductTurn: (
      input: StartProductTurnInput,
    ) => Promise<void>
    readonly beforeProposal?: () => Promise<void>
    readonly failReviewAnswer?: boolean
    readonly proposalFails?: boolean
    readonly reviewResolution?: 'answered' | 'cancelled'
  }) {
    this.onStartProductTurn = options.onStartProductTurn
    this.beforeProposal = options.beforeProposal
    this.failReviewAnswer = options.failReviewAnswer ?? false
    this.proposalFails = options.proposalFails ?? false
    this.reviewResolution = options.reviewResolution ?? 'answered'
  }

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    return { state: 'ready' }
  }

  async startThread(input?: StartThreadInput) {
    assert.ok(input)
    this.threadInput = structuredClone(input)
    this.mcpToken = input.mcp.token
    return { threadId: 'thread-native-A' }
  }

  async startTurn(_input: StartTurnInput): Promise<never> {
    throw new Error('legacy startTurn is not expected')
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.productInputs.push(structuredClone(input))
    await this.onStartProductTurn(input)
    const paths = [...input.text.matchAll(/\[selected-source-\d+\]\(<([^>]+)>\)/g)].map(
      (match) => match[1]!,
    )
    assert.equal(paths.length, 2)
    this.snapshotBytes.push(...(await Promise.all(paths.map((file) => readFile(file)))))
    const runtime = this
    return {
      threadId: input.threadId,
      turnId: 'turn-native-A',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'skill.requested',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          skillName: input.skill!.name,
        }
        const nativeInteractionId =
          `native-interaction:${runtime.threadInput?.workspace}`
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-generic-interaction-item',
          interactionId: nativeInteractionId,
          questions: [
            {
              id: `native-question:${runtime.threadInput?.mcp.token}`,
              header: `작업공간 ${runtime.threadInput?.workspace}`,
              question: '계속 진행할까요?',
              options: null,
              acceptsFreeform: true,
            },
          ],
        }
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-generic-interaction-item',
          interactionId: nativeInteractionId,
          resolution: 'cancelled',
        }
        yield {
          type: 'plan.delta',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-plan-item',
          delta: `계획 조각: ${paths[0]} ${runtime.threadInput?.mcp.token}`,
        }
        yield {
          type: 'plan.completed',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-plan-item',
          text: `두 자료를 검토합니다: ${paths[0]}`,
        }
        yield {
          type: 'mcp_call.started',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-mcp-item',
          tool: 'propose_state_patch',
        }
        assert.ok(runtime.proposal)
        await runtime.beforeProposal?.()
        await callAssignmentProposalTool({
          id: 1,
          proposal: runtime.proposal(input),
          threadInput: runtime.threadInput,
          expectError: runtime.proposalFails,
        })
        if (runtime.proposalFails) {
          yield {
            type: 'mcp_call.failed',
            threadId: input.threadId,
            turnId: 'turn-native-A',
            itemId: 'private-mcp-item',
            tool: 'propose_state_patch',
            displayMessage: 'StatePatch proposal failed.',
          }
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-native-A',
            status: 'interrupted',
          }
          return
        }
        yield {
          type: 'mcp_call.completed',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-mcp-item',
          tool: 'propose_state_patch',
        }
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-review-item',
          interactionId: 'interaction-public-A',
          questions: [assignmentReviewQuestion],
        }
        await runtime.answer.promise
        if (runtime.failReviewAnswer) return
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-review-item',
          interactionId: 'interaction-public-A',
          resolution: runtime.reviewResolution,
        }
        runtime.answerAcknowledged.resolve()
        yield {
          type: 'agent_message.delta',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-agent-item',
          delta: `답변 조각: ${runtime.threadInput?.workspace} ${runtime.threadInput?.mcp.token} ${'가'.repeat(50_000)}`,
        }
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-agent-item',
          text: `Assignment을 반영했습니다. ${runtime.threadInput?.workspace} ${runtime.threadInput?.mcp.token}`,
        }
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          status: 'completed',
        }
      })(),
    }
  }

  async answerUserInput(input: AnswerUserInput): Promise<void> {
    assert.equal(input.interactionId, 'interaction-public-A')
    this.answerInputs.push(structuredClone(input))
    this.answer.resolve()
    if (this.failReviewAnswer) {
      throw new Error('simulated native Review continuation loss')
    }
    await this.answerAcknowledged.promise
  }

  async cancelUserInput(_input: CancelUserInput): Promise<void> {
    throw new Error('cancelUserInput is not expected')
  }

  async interrupt(_input: InterruptTurnInput): Promise<void> {
    this.interruptCalls += 1
  }

  async releaseThread(_input: ReleaseThreadInput): Promise<void> {}

  async close(): Promise<void> {}
}

class RevisionHttpMcpProductRuntime implements CodexProductCapableRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  readonly answerInputs: AnswerUserInput[] = []
  readonly revisionAnswerStarted = deferred<void>()
  originalRequestKey?: string
  replacementRequestKey?: string
  proposal?: (input: StartProductTurnInput) => Record<string, unknown>
  private readonly originalAnswer = deferred<void>()
  private readonly originalAnswerAcknowledged = deferred<void>()
  private readonly replacementAnswer = deferred<void>()
  private readonly replacementAnswerAcknowledged = deferred<void>()
  private readonly revisionAnswerRejection = deferred<void>()
  private productInput?: StartProductTurnInput
  private threadInput?: StartThreadInput

  constructor(
    private readonly options: {
      readonly cancelRevisionResolution?: boolean
      readonly failRevisionAnswer?: boolean
      readonly terminateAfterRevision?: boolean
    } = {},
  ) {}

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    return { state: 'ready' }
  }

  async startThread(input?: StartThreadInput) {
    assert.ok(input)
    this.threadInput = structuredClone(input)
    return { threadId: 'thread-native-revision' }
  }

  async startTurn(_input: StartTurnInput): Promise<never> {
    throw new Error('legacy startTurn is not expected')
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    assert.ok(this.proposal)
    this.productInput = structuredClone(input)
    this.originalRequestKey = requireMatch(
      input.text,
      /requestKey: (proposal_[0-9a-f]{32})/,
    )
    const runtime = this
    return {
      threadId: input.threadId,
      turnId: 'turn-native-revision',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'skill.requested',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          skillName: input.skill!.name,
        }
        yield {
          type: 'mcp_call.started',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-original-mcp-item',
          tool: 'propose_state_patch',
        }
        await callAssignmentProposalTool({
          id: 1,
          proposal: runtime.proposal!(input),
          threadInput: runtime.threadInput,
        })
        yield {
          type: 'mcp_call.completed',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-original-mcp-item',
          tool: 'propose_state_patch',
        }
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-original-review-item',
          interactionId: 'interaction-revision-original',
          questions: [assignmentReviewQuestion],
        }
        await runtime.originalAnswer.promise
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-original-review-item',
          interactionId: 'interaction-revision-original',
          resolution: runtime.options.cancelRevisionResolution
            ? 'cancelled'
            : 'answered',
        }
        runtime.originalAnswerAcknowledged.resolve()
        if (
          runtime.options.terminateAfterRevision ||
          runtime.options.failRevisionAnswer
        ) {
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-native-revision',
            status: 'completed',
          }
          return
        }
        yield {
          type: 'mcp_call.started',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-replacement-mcp-item',
          tool: 'propose_state_patch',
        }
        yield {
          type: 'mcp_call.completed',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-replacement-mcp-item',
          tool: 'propose_state_patch',
        }
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-replacement-review-item',
          interactionId: 'interaction-revision-replacement',
          questions: [assignmentReviewQuestion],
        }
        await runtime.replacementAnswer.promise
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-replacement-review-item',
          interactionId: 'interaction-revision-replacement',
          resolution: 'answered',
        }
        runtime.replacementAnswerAcknowledged.resolve()
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          itemId: 'private-revision-agent-item',
          text: '수정된 Assignment을 반영했습니다.',
        }
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-native-revision',
          status: 'completed',
        }
      })(),
    }
  }

  async answerUserInput(input: AnswerUserInput): Promise<void> {
    this.answerInputs.push(structuredClone(input))
    if (input.interactionId === 'interaction-revision-original') {
      const answer = input.answers.assignment_review_decision
      assert.equal(answer?.[0], 'AY에게 수정 요청')
      assert.ok(answer?.[1]?.trim())
      this.replacementRequestKey = requireMatch(
        answer?.[2] ?? '',
        /replacement requestKey: (proposal_[0-9a-f]{32})/,
      )
      if (this.options.failRevisionAnswer) {
        this.revisionAnswerStarted.resolve()
        await this.revisionAnswerRejection.promise
        this.originalAnswer.resolve()
        throw new StatePatchReviewError(
          'review_conflict',
          'simulated native revision answer failure',
        )
      }
      assert.ok(this.productInput)
      assert.ok(this.proposal)
      if (!this.options.terminateAfterRevision) {
        const replacement = this.proposal(this.productInput)
        replacement.requestKey = this.replacementRequestKey
        replacement.summary =
          '수정 요청을 반영한 replacement Assignment 제안입니다.'
        await callAssignmentProposalTool({
          id: 2,
          proposal: replacement,
          threadInput: this.threadInput,
        })
      }
      this.originalAnswer.resolve()
      await this.originalAnswerAcknowledged.promise
      return
    }
    assert.equal(input.interactionId, 'interaction-revision-replacement')
    this.replacementAnswer.resolve()
    await this.replacementAnswerAcknowledged.promise
  }

  async cancelUserInput(_input: CancelUserInput): Promise<void> {
    throw new Error('cancelUserInput is not expected')
  }

  async interrupt(_input: InterruptTurnInput): Promise<void> {}

  async releaseThread(_input: ReleaseThreadInput): Promise<void> {}

  async close(): Promise<void> {}

  rejectRevisionAnswer(): void {
    this.revisionAnswerRejection.resolve()
  }
}

class NdjsonTrace {
  private readonly frames: Record<string, unknown>[] = []
  private readonly decoder = new TextDecoder()
  private buffer = ''
  private done = false

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {}

  async until(
    predicate: (frame: Record<string, unknown>) => boolean,
  ): Promise<Record<string, unknown>> {
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

  async rest(): Promise<Record<string, unknown>[]> {
    while (!this.done) await this.readNext()
    return this.frames
  }

  private async readNext(): Promise<void> {
    const chunk = await this.reader.read()
    if (chunk.done) {
      this.done = true
      this.buffer += this.decoder.decode()
      if (this.buffer.trim().length > 0) {
        this.frames.push(decodeFrame(this.buffer))
      }
      return
    }
    this.buffer += this.decoder.decode(chunk.value, { stream: true })
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.length > 0) {
        this.frames.push(decodeFrame(line))
      }
    }
  }
}

function decodeFrame(line: string): Record<string, unknown> {
  return decodeProductOperationFrame(
    JSON.parse(line) as unknown,
  ) as unknown as Record<string, unknown>
}
