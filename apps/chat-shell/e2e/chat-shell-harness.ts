import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdir } from 'node:fs/promises'
import { createServer as createHttpServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
import react from '@vitejs/plugin-react'
import { expect, test as base, type Page } from 'playwright/test'
import {
  createServer as createViteServer,
  type ViteDevServer,
} from 'vite'

import {
  createServerApplication,
  type ServerApplication,
} from '../../server/src/server.js'
import { codexChatIdentity } from '../../server/src/testing/codex-chat-test-support.js'
import {
  materializeE2eSemesterWorkspace,
  materializeScanLimitSemesterWorkspace,
  type E2eSemesterWorkspace,
} from '../../../scripts/semester-workspace-materializer.mjs'

export type ChatScenario =
  | 'ready'
  | 'not-ready'
  | 'unavailable'
  | 'acknowledged-interrupt-response-loss'

export const scenarioPrompts = {
  answer: '이번 주에 무엇부터 준비하면 좋을까?',
  cancel: '준비 순서를 다시 함께 정해 줘.',
} as const

export type ProductRuntimeCall =
  | { readonly operation: 'readAccountReadiness' }
  | { readonly operation: 'startThread'; readonly input: StartThreadInput }
  | { readonly operation: 'startProductTurn'; readonly input: StartProductTurnInput }
  | { readonly operation: 'answerUserInput'; readonly input: AnswerUserInput }
  | { readonly operation: 'cancelUserInput'; readonly input: CancelUserInput }
  | { readonly operation: 'interrupt'; readonly input: InterruptTurnInput }

type ChatShellFixtures = {
  scenario: ChatScenario
  chatHarness: ChatShellHarness
  chatPage: Page
}

export type ChatShellHarness = {
  readonly url: string
  readonly calls: () => readonly ProductRuntimeCall[]
  readonly requests: () => readonly string[]
  prepareScanLimitWorkspaceActivation(): Promise<void>
  releaseInterruptResponse(): void
  releaseLateInteraction(): void
  close(): Promise<void>
}

const chatShellRoot = fileURLToPath(new URL('../', import.meta.url))
const packageRoot = fileURLToPath(new URL('../../../', import.meta.url))

export const test = base.extend<ChatShellFixtures>({
  scenario: ['ready', { option: true }],
  chatHarness: async ({ scenario }, provideHarness) => {
    const harness = await startChatShellHarness(scenario)
    try {
      await provideHarness(harness)
    } finally {
      await harness.close()
    }
  },
  chatPage: async ({ chatHarness, page }, providePage) => {
    try {
      await page.goto(chatHarness.url)
      await providePage(page)
    } finally {
      await page.close()
    }
  },
})

export async function selectCanonicalMaterials(page: Page): Promise<void> {
  const materials = page.getByRole('complementary', { name: '학기 자료' })
  await expect(
    materials.getByText('문제해결글쓰기', { exact: true }),
  ).toBeVisible()
  await materials
    .getByRole('checkbox', { name: 'lms-outline-notice.txt 선택' })
    .check()
  await materials
    .getByRole('checkbox', { name: 'problem-solving-syllabus.txt 선택' })
    .check()
  await expect(
    materials.getByText('2 / 2 선택됨', { exact: true }),
  ).toBeVisible()
}

async function startChatShellHarness(
  scenario: ChatScenario,
): Promise<ChatShellHarness> {
  const frontendServer = createHttpServer()
  let viteServer: ViteDevServer | undefined
  let application: ServerApplication | undefined
  let runtime: ProductE2eRuntime | undefined
  let semesterWorkspace: E2eSemesterWorkspace | undefined
  let selectedWorkspaceRoot: string | undefined
  const requests: string[] = []

  try {
    semesterWorkspace = await materializeE2eSemesterWorkspace()
    selectedWorkspaceRoot = semesterWorkspace.workspaceRoot
    process.stdout.write(
      `E2E SemesterWorkspace: ${semesterWorkspace.workspaceRoot}\n`,
    )
    const appDataRoot = path.join(semesterWorkspace.runRoot, 'app-data')
    await mkdir(appDataRoot)
    const semesterWorkspaceBootstrap = {
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => selectedWorkspaceRoot ?? null,
    }
    frontendServer.listen(0, '127.0.0.1')
    await once(frontendServer, 'listening')
    const frontendUrl = serverUrl(frontendServer)

    if (scenario === 'unavailable') {
      application = await createServerApplication({
        codexChatEnvironment: {},
        semesterWorkspace: semesterWorkspaceBootstrap,
      })
    } else {
      runtime = new ProductE2eRuntime(
        scenario === 'not-ready'
          ? { state: 'not_ready', reason: 'authentication_required' }
          : { state: 'ready' },
        scenario === 'acknowledged-interrupt-response-loss',
      )
      application = await createServerApplication({
        codexChat: {
          ...codexChatIdentity,
          origin: frontendUrl,
          createRuntime: async () => runtime!,
        },
        semesterWorkspace: semesterWorkspaceBootstrap,
      })
    }

    const activation = await application.semesterWorkspace?.activate()
    if (
      activation?.status === 'activated' &&
      activation.workspace.state === 'ready' &&
      activation.workspace.course === null
    ) {
      await application.semesterWorkspace?.createCourse('문제해결글쓰기')
    }

    const apiAddress = await application.listen(0, '127.0.0.1')
    const apiUrl = `http://127.0.0.1:${apiAddress.port}`
    viteServer = await createViteServer({
      appType: 'spa',
      configFile: false,
      root: chatShellRoot,
      plugins: [react()],
      server: {
        hmr: false,
        middlewareMode: true,
        proxy: {
          '/api': apiUrl,
        },
      },
    })
    frontendServer.on('request', (request, response) => {
      const pathname = new URL(request.url ?? '/', frontendUrl).pathname
      if (pathname.startsWith('/api/')) requests.push(pathname)
      viteServer!.middlewares(request, response, () => {
        if (!response.headersSent) {
          response.statusCode = 404
          response.end()
        }
      })
    })

    let closed = false
    return {
      url: frontendUrl,
      calls: () => runtime?.calls ?? [],
      requests: () => [...requests],
      async prepareScanLimitWorkspaceActivation() {
        if (!semesterWorkspace) {
          throw new Error('E2E SemesterWorkspace is unavailable')
        }
        const candidateRoot = path.join(
          semesterWorkspace.runRoot,
          'scan-limit-semester',
        )
        await materializeScanLimitSemesterWorkspace(candidateRoot)
        selectedWorkspaceRoot = candidateRoot
      },
      releaseLateInteraction() {
        if (!runtime) throw new Error('E2E product runtime is unavailable')
        runtime.releaseLateInteraction()
      },
      releaseInterruptResponse() {
        if (!runtime) throw new Error('E2E product runtime is unavailable')
        runtime.releaseInterruptResponse()
      },
      async close() {
        if (closed) return
        closed = true
        await cleanupHarnessResources({
          frontendServer,
          viteServer,
          application,
          semesterWorkspace,
        })
      },
    }
  } catch (error) {
    await cleanupHarnessResources({
      frontendServer,
      viteServer,
      application,
      semesterWorkspace,
    }).catch(() => undefined)
    throw error
  }
}

async function cleanupHarnessResources({
  frontendServer,
  viteServer,
  application,
  semesterWorkspace,
}: {
  readonly frontendServer: Server
  readonly viteServer: ViteDevServer | undefined
  readonly application: ServerApplication | undefined
  readonly semesterWorkspace: E2eSemesterWorkspace | undefined
}): Promise<void> {
  const results = await Promise.allSettled([
    closeHttpServer(frontendServer),
    viteServer?.close() ?? Promise.resolve(),
    application?.close() ?? Promise.resolve(),
  ])
  const workspaceCleanup = await Promise.allSettled([
    semesterWorkspace?.cleanup() ?? Promise.resolve(),
  ])
  const rejected = [...results, ...workspaceCleanup].find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )
  if (rejected) throw rejected.reason
}

type PendingInteraction = {
  readonly turnId: string
  readonly settlement: Deferred<PendingInteractionSettlement>
  readonly acknowledged: Deferred<void>
}

type PendingInteractionSettlement =
  | {
      readonly resolution: 'answered'
      readonly answers: AnswerUserInput['answers']
    }
  | { readonly resolution: 'cancelled' }

class ProductE2eRuntime implements CodexProductCapableRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  private readonly callLog: ProductRuntimeCall[] = []
  private readonly threadInputs: StartThreadInput[] = []
  private readonly pendingInteractions = new Map<string, PendingInteraction>()
  private readonly interruptedTurns = new Set<string>()
  private readonly activeTurns = new Set<Deferred<void>>()
  private readonly interruptObserved = deferred<void>()
  private readonly interruptResponseReleased = deferred<void>()
  private readonly lateInteractionReleased = deferred<void>()
  private turnOrdinal = 0

  constructor(
    private readonly readiness: CodexAccountReadiness,
    private readonly acknowledgedInterruptResponseLoss = false,
  ) {}

  get calls(): readonly ProductRuntimeCall[] {
    return this.callLog.map((call) => structuredClone(call))
  }

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    this.callLog.push({ operation: 'readAccountReadiness' })
    return { ...this.readiness }
  }

  async startThread(input?: StartThreadInput) {
    assert.ok(input)
    this.threadInputs.push(structuredClone(input))
    this.callLog.push({ operation: 'startThread', input: structuredClone(input) })
    return { threadId: 'thread-private-e2e' }
  }

  async startTurn(_input: StartTurnInput): Promise<never> {
    throw new Error('The legacy Chat route is not expected in product E2E.')
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.callLog.push({
      operation: 'startProductTurn',
      input: structuredClone(input),
    })
    this.turnOrdinal += 1
    const turnId = `turn-private-e2e-${this.turnOrdinal}`
    const turn = input.skill
      ? this.assignmentTurn(input, turnId)
      : this.clarificationTurn(input, turnId)
    return { ...turn, events: this.trackTurn(turn.events) }
  }

  async answerUserInput(input: AnswerUserInput): Promise<void> {
    this.callLog.push({
      operation: 'answerUserInput',
      input: structuredClone(input),
    })
    const pending = this.requirePending(input.interactionId)
    pending.settlement.resolve({
      resolution: 'answered',
      answers: structuredClone(input.answers),
    })
    await pending.acknowledged.promise
  }

  async cancelUserInput(input: CancelUserInput): Promise<void> {
    this.callLog.push({
      operation: 'cancelUserInput',
      input: structuredClone(input),
    })
    const pending = this.requirePending(input.interactionId)
    pending.settlement.resolve({ resolution: 'cancelled' })
    await pending.acknowledged.promise
  }

  async interrupt(input: InterruptTurnInput): Promise<void> {
    this.callLog.push({ operation: 'interrupt', input: { ...input } })
    this.interruptedTurns.add(input.turnId)
    this.interruptObserved.resolve()
    for (const pending of this.pendingInteractions.values()) {
      if (pending.turnId === input.turnId) {
        pending.settlement.resolve({ resolution: 'cancelled' })
      }
    }
    if (this.acknowledgedInterruptResponseLoss) {
      await this.interruptResponseReleased.promise
    }
  }

  async releaseThread(_input: ReleaseThreadInput): Promise<void> {}

  async close(): Promise<void> {
    this.interruptObserved.resolve()
    this.interruptResponseReleased.resolve()
    this.lateInteractionReleased.resolve()
    for (const pending of this.pendingInteractions.values()) {
      pending.settlement.resolve({ resolution: 'cancelled' })
    }
    await Promise.all([...this.activeTurns].map((turn) => turn.promise))
  }

  releaseLateInteraction(): void {
    this.lateInteractionReleased.resolve()
  }

  releaseInterruptResponse(): void {
    this.interruptResponseReleased.resolve()
  }

  private trackTurn(
    events: AsyncIterable<CodexProductActivity>,
  ): AsyncIterable<CodexProductActivity> {
    const activeTurns = this.activeTurns
    return (async function* (): AsyncIterable<CodexProductActivity> {
      const settled = deferred<void>()
      activeTurns.add(settled)
      try {
        for await (const event of events) yield event
      } finally {
        activeTurns.delete(settled)
        settled.resolve()
      }
    })()
  }

  private assignmentTurn(
    input: StartProductTurnInput,
    turnId: string,
  ): CodexProductTurn {
    const callProposalTool = this.callProposalTool.bind(this)
    const createPending = this.createPending.bind(this)
    const acknowledge = this.acknowledge.bind(this)
    const wasInterrupted = this.wasInterrupted.bind(this)
    const acknowledgedInterruptResponseLoss =
      this.acknowledgedInterruptResponseLoss
    const interruptObserved = this.interruptObserved.promise
    const lateInteractionReleased = this.lateInteractionReleased.promise
    const interactionId = `interaction-review-${this.turnOrdinal}`
    const replacementInteractionId = `${interactionId}-replacement`
    return {
      threadId: input.threadId,
      turnId,
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'skill.requested',
          threadId: input.threadId,
          turnId,
          skillName: input.skill!.name,
        }
        yield {
          type: 'plan.delta',
          threadId: input.threadId,
          turnId,
          itemId: `plan-private-${turnId}`,
          delta: '선택한 두 자료에서 과제명, 마감, 제출 방식을 ',
        }
        yield {
          type: 'plan.completed',
          threadId: input.threadId,
          turnId,
          itemId: `plan-private-${turnId}`,
          text: '선택한 두 자료에서 과제명, 마감, 제출 방식을 확인합니다.',
        }
        yield {
          type: 'mcp_call.started',
          threadId: input.threadId,
          turnId,
          itemId: `mcp-private-${turnId}`,
          tool: 'propose_state_patch',
        }
        await callProposalTool(input.text)
        yield {
          type: 'mcp_call.completed',
          threadId: input.threadId,
          turnId,
          itemId: `mcp-private-${turnId}`,
          tool: 'propose_state_patch',
        }
        if (acknowledgedInterruptResponseLoss) {
          await interruptObserved
          yield {
            type: 'turn.interrupt_acknowledged',
            threadId: input.threadId,
            turnId,
          }
        }
        const pending = createPending(interactionId, turnId)
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId,
          itemId: `review-private-${turnId}`,
          interactionId,
          questions: [assignmentReviewQuestion],
        }
        if (acknowledgedInterruptResponseLoss) {
          await lateInteractionReleased
          pending.settlement.resolve({ resolution: 'cancelled' })
        }
        const firstSettlement = await pending.settlement.promise
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId,
          itemId: `review-private-${turnId}`,
          interactionId,
          resolution: firstSettlement.resolution,
        }
        acknowledge(interactionId)
        if (wasInterrupted(turnId)) {
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId,
            status: 'interrupted',
          }
          return
        }
        let finalChoice = assignmentReviewChoice(firstSettlement)
        if (finalChoice.type === 'revise') {
          yield {
            type: 'mcp_call.started',
            threadId: input.threadId,
            turnId,
            itemId: `mcp-replacement-private-${turnId}`,
            tool: 'propose_state_patch',
          }
          await callProposalTool(input.text, {
            requestKey: finalChoice.requestKey,
            summary: '수정 요청을 반영해 제출 방식을 다시 정리했습니다.',
            submissionMethod: 'LMS',
          })
          yield {
            type: 'mcp_call.completed',
            threadId: input.threadId,
            turnId,
            itemId: `mcp-replacement-private-${turnId}`,
            tool: 'propose_state_patch',
          }
          const replacementPending = createPending(
            replacementInteractionId,
            turnId,
          )
          yield {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId,
            itemId: `review-replacement-private-${turnId}`,
            interactionId: replacementInteractionId,
            questions: [assignmentReviewQuestion],
          }
          const replacementSettlement =
            await replacementPending.settlement.promise
          yield {
            type: 'user_input.resolved',
            threadId: input.threadId,
            turnId,
            itemId: `review-replacement-private-${turnId}`,
            interactionId: replacementInteractionId,
            resolution: replacementSettlement.resolution,
          }
          acknowledge(replacementInteractionId)
          if (wasInterrupted(turnId)) {
            yield {
              type: 'turn.completed',
              threadId: input.threadId,
              turnId,
              status: 'interrupted',
            }
            return
          }
          finalChoice = assignmentReviewChoice(replacementSettlement)
          assert.notEqual(finalChoice.type, 'revise')
        }
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId,
          itemId: `agent-private-${turnId}`,
          text:
            finalChoice.type === 'accept'
              ? '확인한 과제 정보를 학기 작업공간에 반영했습니다.'
              : '변경 제안을 학기 작업공간에 반영하지 않았습니다.',
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

  private clarificationTurn(
    input: StartProductTurnInput,
    turnId: string,
  ): CodexProductTurn {
    const createPending = this.createPending.bind(this)
    const acknowledge = this.acknowledge.bind(this)
    const wasInterrupted = this.wasInterrupted.bind(this)
    const acknowledgedInterruptResponseLoss =
      this.acknowledgedInterruptResponseLoss
    const interruptObserved = this.interruptObserved.promise
    const lateInteractionReleased = this.lateInteractionReleased.promise
    const interactionId = `interaction-general-${this.turnOrdinal}`
    return {
      threadId: input.threadId,
      turnId,
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'plan.completed',
          threadId: input.threadId,
          turnId,
          itemId: `plan-private-${turnId}`,
          text: '자료를 살펴볼 순서를 함께 정합니다.',
        }
        if (acknowledgedInterruptResponseLoss) {
          await interruptObserved
          yield {
            type: 'turn.interrupt_acknowledged',
            threadId: input.threadId,
            turnId,
          }
        }
        const pending = createPending(interactionId, turnId)
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId,
          itemId: `question-private-${turnId}`,
          interactionId,
          questions: [generalQuestion],
        }
        if (acknowledgedInterruptResponseLoss) {
          await lateInteractionReleased
          pending.settlement.resolve({ resolution: 'cancelled' })
        }
        const settlement = await pending.settlement.promise
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId,
          itemId: `question-private-${turnId}`,
          interactionId,
          resolution: settlement.resolution,
        }
        acknowledge(interactionId)
        if (wasInterrupted(turnId)) {
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId,
            status: 'interrupted',
          }
          return
        }
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId,
          itemId: `agent-private-${turnId}`,
          text:
            settlement.resolution === 'answered'
              ? '답변을 바탕으로 준비 순서를 정리했습니다.'
              : '질문을 취소하고 현재 정보만으로 정리했습니다.',
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

  private async callProposalTool(
    text: string,
    overrides?: ProposalOverrides,
  ): Promise<void> {
    const threadInput = this.threadInputs[0]
    assert.ok(threadInput)
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
          arguments: proposalFromAssignmentInput(text, overrides),
        },
      }),
    })
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      readonly result?: { readonly isError?: boolean }
    }
    assert.equal(body.result?.isError, false)
  }

  private createPending(
    interactionId: string,
    turnId: string,
  ): PendingInteraction {
    const pending = {
      turnId,
      settlement: deferred<PendingInteractionSettlement>(),
      acknowledged: deferred<void>(),
    }
    this.pendingInteractions.set(interactionId, pending)
    return pending
  }

  private requirePending(interactionId: string): PendingInteraction {
    const pending = this.pendingInteractions.get(interactionId)
    if (!pending) throw new Error('The product interaction is not pending.')
    return pending
  }

  private acknowledge(interactionId: string): void {
    const pending = this.requirePending(interactionId)
    this.pendingInteractions.delete(interactionId)
    pending.acknowledged.resolve()
  }

  private wasInterrupted(turnId: string): boolean {
    return this.interruptedTurns.has(turnId)
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

type ProposalOverrides = {
  readonly requestKey: string
  readonly summary: string
  readonly submissionMethod: string
}

type AssignmentReviewChoice =
  | { readonly type: 'accept' | 'reject' | 'cancelled' }
  | {
      readonly type: 'revise'
      readonly feedback: string
      readonly requestKey: string
    }

function assignmentReviewChoice(
  settlement: PendingInteractionSettlement,
): AssignmentReviewChoice {
  if (settlement.resolution === 'cancelled') return { type: 'cancelled' }
  const values = settlement.answers[assignmentReviewQuestion.id]
  assert.ok(values)
  if (values[0] === '수락') return { type: 'accept' }
  if (values[0] === '거절') return { type: 'reject' }
  assert.equal(values[0], 'AY에게 수정 요청')
  assert.ok(values[1])
  assert.ok(values[2])
  return {
    type: 'revise',
    feedback: values[1],
    requestKey: requireMatch(
      values[2],
      /^replacement requestKey: (proposal_[0-9a-f]{32})$/u,
    ),
  }
}

function proposalFromAssignmentInput(
  text: string,
  overrides?: ProposalOverrides,
): Record<string, unknown> {
  const sources = [...text.matchAll(/RawMaterial (material_[0-9a-f]{32}) \(([0-9a-f]{64})\)/gu)]
  assert.equal(sources.length, 2)
  const notice = sources[0]
  const syllabus = sources[1]
  assert.ok(notice?.[1] && notice[2] && syllabus?.[1] && syllabus[2])
  return {
    requestKey:
      overrides?.requestKey ??
      requireMatch(text, /requestKey: (proposal_[0-9a-f]{32})/u),
    workspaceId: requireMatch(text, /workspaceId: (workspace_[0-9a-f]{32})/u),
    courseId: requireMatch(text, /courseId: (course_[0-9a-f]{32})/u),
    baseRevision: Number(requireMatch(text, /baseRevision: (\d+)/u)),
    summary:
      overrides?.summary ?? '선택 자료에서 개요 작성 과제를 확인했습니다.',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '개요 작성하기',
        dueAt: '2026-07-12T23:59:00+09:00',
        submissionMethod: overrides?.submissionMethod ?? 'LMS 과제함 업로드',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: syllabus[1],
        digest: syllabus[2],
        quote: '과제: 개요 작성하기',
      },
      {
        field: 'dueAt',
        rawMaterialId: notice[1],
        digest: notice[2],
        quote: 'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
      },
      {
        field: 'submissionMethod',
        rawMaterialId: syllabus[1],
        digest: syllabus[2],
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

function serverUrl(server: Server): string {
  const address = server.address() as AddressInfo | null
  if (!address) throw new Error('Expected server to be listening')
  return `http://127.0.0.1:${address.port}`
}

function closeHttpServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve()
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}
