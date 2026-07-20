import assert from 'node:assert/strict'
import { access, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import {
  CodexChatRuntimeError,
  type AnswerUserInput,
  type CancelUserInput,
  type CodexAccountReadiness,
  type CodexProductActivity,
  type CodexProductCapableRuntime,
  type CodexProductTurn,
  type InterruptTurnInput,
  type ReleaseThreadInput,
  type StartProductTurnInput,
  type StartThreadInput,
  type StartTurnInput,
} from '@ay-ple/codex-chat-runtime'

import { configuredBootstrap, postJson } from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'
import { materializeE2eSemesterWorkspace } from '../../../scripts/semester-workspace-materializer.mjs'

test('Run-free Product Chat cleans its durable guard and reuses one native Thread across sequential Turns', async () => {
  const fixture = await createChatFixture()
  const runtime = new ProductChatRuntime()

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        await activateCourse(application)
        const traces: Record<string, unknown>[][] = []

        for (const text of ['이번 주 할 일을 요약해 줘.', '그중 첫 항목을 더 설명해 줘.']) {
          const response = await postJson(`${baseUrl}/api/product/chat/messages`, {
            text,
            materials: [],
          })
          assert.equal(response.status, 200)
          assert.equal(
            response.headers.get('content-type'),
            'application/x-ndjson',
          )
          const frames = parseNdjson(await response.text())
          assert.deepEqual(
            frames.map((frame) => frame.type),
            [
              'operation.preparing',
              'operation.accepted',
              'plan.completed',
              'agent_message.completed',
              'operation.terminal',
            ],
          )
          assert.equal(frames.at(-1)?.status, 'completed')
          for (const frame of frames) {
            assert.equal('runId' in frame, false)
            assert.equal('validationOutcome' in frame, false)
          }
          assert.equal(
            frames.some((frame) => frame.type === 'skill.requested'),
            false,
          )
          assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
          await assertPersistedGuardCleared(fixture.workspaceRoot)
          traces.push(frames)
        }

        assert.equal(runtime.threadInputs.length, 1)
        assert.equal(runtime.productInputs.length, 2)
        assert.equal(runtime.productInputs[0]?.threadId, 'thread-private-chat')
        assert.equal(runtime.productInputs[1]?.threadId, 'thread-private-chat')
        assert.equal(runtime.productInputs.every((input) => input.skill === undefined), true)
        for (const input of runtime.productInputs) {
          assert.equal('plan' in input, false)
          assert.ok(Buffer.byteLength(input.text, 'utf8') <= 128 * 1024)
          const scratchPath = requireMatch(
            input.text,
            /Use scratch only for transient writes: ([^\n]+)/,
          )
          await assert.rejects(access(scratchPath))
        }

        assertSafeTrace(traces.flat(), [
          fixture.bootstrap.appDataRoot,
          fixture.workspaceRoot,
          'thread-private-chat',
          'turn-private-chat-1',
          'turn-private-chat-2',
          'private-plan-item-1',
          'private-plan-item-2',
          'private-agent-item-1',
          'private-agent-item-2',
        ])
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('general Plan clarification answers once through public IDs and resumes the same Run-free Chat Turn', async () => {
  const fixture = await createChatFixture()
  const runtime = new ProductChatRuntime()
  runtime.generalInteraction = true

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        await activateCourse(application)
        const before = structuredClone(
          application.semesterWorkspace?.assignmentState(),
        )
        const response = await postJson(`${baseUrl}/api/product/chat/messages`, {
          text: '이번 주에 무엇부터 준비하면 좋을까?',
          materials: [],
        })
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const requested = await trace.until(
          (frame) => frame.type === 'interaction.requested',
        )
        assert.match(String(requested.operationId), /^chat_[0-9a-f]{32}$/)
        assert.match(
          String(requested.interactionId),
          /^interaction_[0-9a-f]{32}$/,
        )
        const questions = requested.questions as Record<string, unknown>[]
        assert.equal(questions.length, 1)
        assert.match(String(questions[0]?.id), /^question_[0-9a-f]{32}$/)
        assertSafeTrace([requested], [
          'interaction-chat-general',
          'private-general-question',
          'thread-private-chat',
          'turn-private-chat-1',
        ])

        const operationId = String(requested.operationId)
        const interactionId = String(requested.interactionId)
        const questionId = String(questions[0]?.id)
        const wrongOperation = await postJson(
          `${baseUrl}/api/product/operations/chat_${'0'.repeat(32)}/interactions/${interactionId}/answer`,
          { answers: { [questionId]: ['강의 자료부터'] } },
        )
        const wrongInteraction = await postJson(
          `${baseUrl}/api/product/operations/${operationId}/interactions/interaction_${'0'.repeat(32)}/answer`,
          { answers: { [questionId]: ['강의 자료부터'] } },
        )
        const wrongQuestion = await postJson(
          `${baseUrl}/api/product/operations/${operationId}/interactions/${interactionId}/answer`,
          {
            answers: {
              [`question_${'0'.repeat(32)}`]: ['강의 자료부터'],
            },
          },
        )
        assert.equal(wrongOperation.status, 409)
        assert.equal(wrongInteraction.status, 409)
        assert.equal(wrongQuestion.status, 409)
        assert.equal(
          ((await wrongOperation.json()) as { readonly code?: string }).code,
          'interaction_invalid',
        )
        assert.equal(runtime.answerInputs.length, 0)

        const answerUrl = `${baseUrl}/api/product/operations/${operationId}/interactions/${interactionId}/answer`
        const answerBody = {
          answers: { [questionId]: ['강의 자료부터'] },
        }
        const [first, duplicate] = await Promise.all([
          postJson(answerUrl, answerBody),
          postJson(answerUrl, answerBody),
        ])
        assert.deepEqual(
          [first.status, duplicate.status].sort((left, right) => left - right),
          [202, 409],
        )
        assert.deepEqual(runtime.answerInputs, [
          {
            interactionId: 'interaction-chat-general',
            answers: { 'private-general-question': ['강의 자료부터'] },
          },
        ])

        const frames = await trace.rest()
        assert.deepEqual(
          frames.map((frame) => frame.type),
          [
            'operation.preparing',
            'operation.accepted',
            'plan.completed',
            'interaction.requested',
            'interaction.resolved',
            'agent_message.completed',
            'operation.terminal',
          ],
        )
        assert.equal(
          frames.find((frame) => frame.type === 'interaction.resolved')
            ?.resolution,
          'answered',
        )
        assert.equal(frames.at(-1)?.status, 'completed')

        const late = await postJson(answerUrl, answerBody)
        assert.equal(late.status, 409)
        assert.equal(runtime.answerInputs.length, 1)
        assert.deepEqual(
          application.semesterWorkspace?.assignmentState(),
          before,
        )
        assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
        await assertPersistedGuardCleared(fixture.workspaceRoot)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('authoritative interaction-not-pending consumes a general clarification before a serial late retry', async () => {
  const fixture = await createChatFixture()
  const runtime = new ProductChatRuntime()
  runtime.generalInteraction = true
  runtime.generalAnswerError = new CodexChatRuntimeError({
    code: 'interaction_not_pending',
    displayMessage: 'The user-input interaction is not pending.',
    unknownOutcome: false,
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        await activateCourse(application)
        const response = await postJson(`${baseUrl}/api/product/chat/messages`, {
          text: '준비 순서를 함께 정해 줘.',
          materials: [],
        })
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const requested = await trace.until(
          (frame) => frame.type === 'interaction.requested',
        )
        const question = (requested.questions as Record<string, unknown>[])[0]
        assert.ok(question)
        const answerUrl = `${baseUrl}/api/product/operations/${requested.operationId}/interactions/${requested.interactionId}/answer`
        const answerBody = {
          answers: { [String(question.id)]: ['강의 자료부터'] },
        }

        const first = await postJson(answerUrl, answerBody)
        const late = await postJson(answerUrl, answerBody)
        runtime.settleGeneralInteraction('cancelled')
        await trace.rest()

        assert.equal(first.status, 500)
        assert.equal(late.status, 409)
        assert.equal(runtime.answerInputs.length, 1)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('general Plan clarification cancellation resumes without academic mutation', async () => {
  const fixture = await createChatFixture()
  const runtime = new ProductChatRuntime()
  runtime.generalInteraction = true

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        await activateCourse(application)
        const before = structuredClone(
          application.semesterWorkspace?.assignmentState(),
        )
        const response = await postJson(`${baseUrl}/api/product/chat/messages`, {
          text: '준비 순서를 함께 정해 줘.',
          materials: [],
        })
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const requested = await trace.until(
          (frame) => frame.type === 'interaction.requested',
        )
        const cancelResponse = await postJson(
          `${baseUrl}/api/product/operations/${requested.operationId}/interactions/${requested.interactionId}/cancel`,
          {},
        )
        assert.equal(cancelResponse.status, 202)
        assert.deepEqual(runtime.cancelInputs, [
          { interactionId: 'interaction-chat-general' },
        ])

        const frames = await trace.rest()
        assert.equal(
          frames.find((frame) => frame.type === 'interaction.resolved')
            ?.resolution,
          'cancelled',
        )
        assert.equal(frames.at(-1)?.status, 'completed')
        assert.deepEqual(
          application.semesterWorkspace?.assignmentState(),
          before,
        )
        assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
        await assertPersistedGuardCleared(fixture.workspaceRoot)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('selected-material Product Chat offers a private MCP proposal and Review without creating a ModelingRun', async () => {
  const fixture = await createChatFixture()
  const runtime = new ProductChatRuntime()

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
          validProposalFromProductInput(input, workspace.course!.id, selected)

        const response = await postJson(`${baseUrl}/api/product/chat/messages`, {
          text: '선택한 자료에서 과제를 구조화해 줘.',
          materials: selected,
        })
        assert.equal(response.status, 200)
        const stream = response.body?.getReader()
        assert.ok(stream)
        const trace = new NdjsonTrace(stream)
        const review = await trace.until(
          (frame) => frame.type === 'review.requested',
        )

        const generalResponse = await postJson(
          `${baseUrl}/api/product/operations/${review.operationId}/interactions/${review.interactionId}/cancel`,
          {},
        )
        assert.equal(generalResponse.status, 409)

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
        })

        const frames = await trace.rest()
        assert.deepEqual(
          frames.map((frame) => frame.type),
          [
            'operation.preparing',
            'operation.accepted',
            'plan.completed',
            'mcp_call.started',
            'mcp_call.completed',
            'review.requested',
            'review.resolved',
            'agent_message.completed',
            'operation.terminal',
          ],
        )
        assert.equal(frames.at(-1)?.status, 'completed')
        for (const frame of frames) {
          assert.equal('runId' in frame, false)
          assert.equal('validationOutcome' in frame, false)
        }
        assert.equal(
          frames.some((frame) => frame.type === 'skill.requested'),
          false,
        )
        assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
        assert.equal(
          application.semesterWorkspace?.assignmentState().assignments.length,
          1,
        )
        await assertPersistedGuardCleared(fixture.workspaceRoot)

        assert.equal(runtime.threadInputs.length, 1)
        assert.equal(runtime.productInputs.length, 1)
        const input = runtime.productInputs[0]!
        assert.equal(input.skill, undefined)
        assert.equal('plan' in input, false)
        assert.ok(Buffer.byteLength(input.text, 'utf8') <= 128 * 1024)
        assert.match(input.text, /개요 작성하기 과제 마감/)
        assert.match(input.text, /제출 방식: LMS 과제함 업로드/)
        assert.equal(input.text.includes('최종 보고서 과제 마감'), false)
        assert.equal(input.text.includes('unselected-control.txt'), false)

        const requestKey = requireMatch(
          input.text,
          /requestKey=(proposal_[0-9a-f]{32})/,
        )
        const workspaceId = requireMatch(
          input.text,
          /workspaceId=(workspace_[0-9a-f]{32})/,
        )
        assertSafeTrace(frames, [
          fixture.bootstrap.appDataRoot,
          fixture.workspaceRoot,
          'thread-private-chat',
          'turn-private-chat-1',
          'private-plan-item-1',
          'private-mcp-item-1',
          'private-review-item-1',
          'private-agent-item-1',
          requestKey,
          workspaceId,
        ])
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

async function createChatFixture() {
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
    activate(): Promise<{ readonly status: 'activated' | 'cancelled' }>
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

async function assertPersistedGuardCleared(
  workspaceRoot: string,
): Promise<void> {
  const persisted = JSON.parse(
    await readFile(
      path.join(workspaceRoot, '.ay-ple', 'workspace-state.json'),
      'utf8',
    ),
  ) as Record<string, unknown>
  assert.equal(persisted.executionGuard, null)
  assert.deepEqual(persisted.modelingRuns, [])
}

function assertSafeTrace(
  frames: readonly Record<string, unknown>[],
  privateValues: readonly string[],
): void {
  const encoded = JSON.stringify(frames)
  for (const privateValue of privateValues) {
    assert.equal(
      encoded.includes(privateValue),
      false,
      `public trace leaked private value: ${privateValue}`,
    )
  }
}

function validProposalFromProductInput(
  input: StartProductTurnInput,
  courseId: string,
  selected: readonly MaterialSelection[],
): Record<string, unknown> {
  const requestKey = requireMatch(
    input.text,
    /requestKey=(proposal_[0-9a-f]{32})/,
  )
  const workspaceId = requireMatch(
    input.text,
    /workspaceId=(workspace_[0-9a-f]{32})/,
  )
  const baseRevision = Number(
    requireMatch(input.text, /baseRevision=(\d+)/),
  )
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

function parseNdjson(encoded: string): Record<string, unknown>[] {
  return encoded
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
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

class ProductChatRuntime implements CodexProductCapableRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  readonly productInputs: StartProductTurnInput[] = []
  readonly threadInputs: StartThreadInput[] = []
  readonly answerInputs: AnswerUserInput[] = []
  readonly cancelInputs: CancelUserInput[] = []
  generalInteraction = false
  generalAnswerError?: CodexChatRuntimeError
  proposal?: (input: StartProductTurnInput) => Record<string, unknown>
  private readonly answer = deferred<void>()
  private readonly answerAcknowledged = deferred<void>()
  private readonly generalSettlement = deferred<'answered' | 'cancelled'>()
  private readonly generalSettlementAcknowledged = deferred<void>()

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    return { state: 'ready' }
  }

  async startThread(input?: StartThreadInput) {
    assert.ok(input)
    this.threadInputs.push(structuredClone(input))
    return { threadId: 'thread-private-chat' }
  }

  async startTurn(_input: StartTurnInput): Promise<never> {
    throw new Error('legacy startTurn is not expected')
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    assert.equal(input.skill, undefined)
    this.productInputs.push(structuredClone(input))
    const ordinal = this.productInputs.length
    const turnId = `turn-private-chat-${ordinal}`
    const runtime = this
    const selected = input.text.includes('Proposal context:')
    return {
      threadId: input.threadId,
      turnId,
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'plan.completed',
          threadId: input.threadId,
          turnId,
          itemId: `private-plan-item-${ordinal}`,
          text: `계획을 준비했습니다: ${runtime.threadInputs[0]?.workspace} ${input.threadId} ${turnId}`,
        }
        if (runtime.generalInteraction) {
          yield {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId,
            itemId: `private-general-item-${ordinal}`,
            interactionId: 'interaction-chat-general',
            questions: [generalQuestion],
          }
          const resolution = await runtime.generalSettlement.promise
          yield {
            type: 'user_input.resolved',
            threadId: input.threadId,
            turnId,
            itemId: `private-general-item-${ordinal}`,
            interactionId: 'interaction-chat-general',
            resolution,
          }
          runtime.generalSettlementAcknowledged.resolve()
        }
        if (selected) {
          yield {
            type: 'mcp_call.started',
            threadId: input.threadId,
            turnId,
            itemId: `private-mcp-item-${ordinal}`,
            tool: 'propose_state_patch',
          }
          await runtime.callProposalTool(input)
          yield {
            type: 'mcp_call.completed',
            threadId: input.threadId,
            turnId,
            itemId: `private-mcp-item-${ordinal}`,
            tool: 'propose_state_patch',
          }
          yield {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId,
            itemId: `private-review-item-${ordinal}`,
            interactionId: 'interaction-chat-review',
            questions: [assignmentReviewQuestion],
          }
          await runtime.answer.promise
          yield {
            type: 'user_input.resolved',
            threadId: input.threadId,
            turnId,
            itemId: `private-review-item-${ordinal}`,
            interactionId: 'interaction-chat-review',
            resolution: 'answered',
          }
          runtime.answerAcknowledged.resolve()
        }
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId,
          itemId: `private-agent-item-${ordinal}`,
          text: `답변을 완료했습니다: ${runtime.threadInputs[0]?.workspace} ${input.threadId} ${turnId}`,
        }
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId,
          status: 'completed',
        }
      })(),
    }
  }

  async answerUserInput(input: AnswerUserInput): Promise<void> {
    if (input.interactionId === 'interaction-chat-general') {
      this.answerInputs.push(structuredClone(input))
      if (this.generalAnswerError) throw this.generalAnswerError
      this.generalSettlement.resolve('answered')
      await this.generalSettlementAcknowledged.promise
      return
    }
    assert.equal(input.interactionId, 'interaction-chat-review')
    this.answer.resolve()
    await this.answerAcknowledged.promise
  }

  async cancelUserInput(input: CancelUserInput): Promise<void> {
    assert.equal(input.interactionId, 'interaction-chat-general')
    this.cancelInputs.push(structuredClone(input))
    this.generalSettlement.resolve('cancelled')
    await this.generalSettlementAcknowledged.promise
  }

  async interrupt(_input: InterruptTurnInput): Promise<void> {}

  async releaseThread(_input: ReleaseThreadInput): Promise<void> {}

  async close(): Promise<void> {}

  settleGeneralInteraction(resolution: 'answered' | 'cancelled'): void {
    this.generalSettlement.resolve(resolution)
  }

  private async callProposalTool(input: StartProductTurnInput): Promise<void> {
    const threadInput = this.threadInputs[0]
    assert.ok(threadInput)
    assert.ok(this.proposal)
    const response = await fetch(threadInput.mcp.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ay-ple-mcp-token': threadInput.mcp.token,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'propose_state_patch',
          arguments: this.proposal(input),
        },
      }),
    })
    assert.equal(response.status, 200)
    const result = (await response.json()) as {
      readonly result?: { readonly isError?: boolean }
    }
    assert.equal(result.result?.isError, false)
  }
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

const generalQuestion = {
  id: 'private-general-question',
  header: '준비 순서',
  question: '어떤 자료부터 살펴볼까요?',
  options: [
    {
      label: '강의 자료부터',
      description: '강의 자료의 요구사항을 먼저 확인합니다.',
    },
  ],
  acceptsFreeform: true,
} as const

class NdjsonTrace {
  private readonly frames: Record<string, unknown>[] = []
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
      if (this.buffer.trim().length > 0) {
        this.frames.push(JSON.parse(this.buffer) as Record<string, unknown>)
      }
      return
    }
    this.buffer += new TextDecoder().decode(chunk.value, { stream: true })
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.length > 0) {
        this.frames.push(JSON.parse(line) as Record<string, unknown>)
      }
    }
  }
}
