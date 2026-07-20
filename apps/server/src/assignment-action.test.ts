import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
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
} from './assignment-recipe.js'
import { configuredBootstrap, postJson } from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'
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

test('the HTTP action commits one Run before exact Skill input and streams MCP Review before authoritative settlement', async () => {
  const fixture = await createActionFixture()
  let applicationRef:
    | Parameters<Parameters<typeof withTestServer>[1]>[1]
    | undefined
  const runtime = new HttpMcpProductRuntime({
    onStartProductTurn: async (input) => {
      const runs = applicationRef?.semesterWorkspace?.modelingRuns() ?? []
      assert.equal(runs.length, 1)
      assert.equal(runs[0]?.status, 'starting')
      assert.equal(input.skill?.name, 'ay-ple-first-assignment')
      assert.match(input.skill?.path ?? '', /\/SKILL\.md$/)
      assert.equal(input.plan.model, 'gpt-5.4')
      assert.equal(input.plan.reasoningEffort, 'medium')
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
        assert.equal(application.semesterWorkspace?.assignmentState().assignments.length, 1)
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

class HttpMcpProductRuntime implements CodexProductCapableRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  readonly productInputs: StartProductTurnInput[] = []
  readonly snapshotBytes: Buffer[] = []
  mcpToken?: string
  proposal?: (input: StartProductTurnInput) => Record<string, unknown>
  private readonly onStartProductTurn: (
    input: StartProductTurnInput,
  ) => Promise<void>
  private readonly answer = deferred<void>()
  private readonly answerAcknowledged = deferred<void>()
  private threadInput?: StartThreadInput

  constructor(options: {
    readonly onStartProductTurn: (
      input: StartProductTurnInput,
    ) => Promise<void>
  }) {
    this.onStartProductTurn = options.onStartProductTurn
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
        await runtime.callProposalTool(input)
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
          questions: [
            {
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
            },
          ],
        }
        await runtime.answer.promise
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId: 'turn-native-A',
          itemId: 'private-review-item',
          interactionId: 'interaction-public-A',
          resolution: 'answered',
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
    this.answer.resolve()
    await this.answerAcknowledged.promise
  }

  async cancelUserInput(_input: CancelUserInput): Promise<void> {
    throw new Error('cancelUserInput is not expected')
  }

  async interrupt(_input: InterruptTurnInput): Promise<void> {}

  async releaseThread(_input: ReleaseThreadInput): Promise<void> {}

  async close(): Promise<void> {}

  private async callProposalTool(input: StartProductTurnInput): Promise<void> {
    assert.ok(this.threadInput)
    assert.ok(this.proposal)
    const response = await fetch(this.threadInput.mcp.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ay-ple-mcp-token': this.threadInput.mcp.token,
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
        this.frames.push(JSON.parse(this.buffer) as Record<string, unknown>)
      }
      return
    }
    this.buffer += this.decoder.decode(chunk.value, { stream: true })
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.length > 0) {
        this.frames.push(JSON.parse(line) as Record<string, unknown>)
      }
    }
  }
}
