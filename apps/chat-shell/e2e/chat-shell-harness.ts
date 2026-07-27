import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import {
  createServer as createHttpServer,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  type AnswerUserInput,
  type CancelUserInput,
  type CodexAccountReadiness,
  type CodexChatRuntimeError,
  type CodexProductActivity,
  type CodexProductTurn,
  type CodexWorkspaceRuntime,
  type InterruptTurnInput,
  type ReleaseThreadInput,
  type StartProductTurnInput,
  type StartThreadInput,
  type StartTurnInput,
} from '@ay-ple/codex-chat-runtime'
import type { ProductBootstrap } from '@ay-ple/product-contract'
import react from '@vitejs/plugin-react'
import { expect, test as base, type Page } from 'playwright/test'
import {
  createServer as createViteServer,
  type ViteDevServer,
} from 'vite'

import {
  createServerApplication,
  listenToServerApplication,
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
  | 'source-conflict'
  | 'store-conflict'
  | 'invalid-store'
  | 'acknowledged-interrupt-response-loss'
  | 'disconnect-drain-timeout'
  | 'fail-closed-oracle'
  | 'reload-before-interrupt-settlement'
  | 'post-review-clarification'
  | 'semantic-review'

type ProductRuntimeScenario = Exclude<ChatScenario, 'unavailable'>

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

export type FailClosedProposalCase =
  | 'unselected-evidence'
  | 'quote-mismatch'
  | 'stale-base'
  | 'valid'

type FailClosedProposalScriptCase =
  | {
      readonly type: 'unselected-evidence'
      readonly material: {
        readonly id: string
        readonly digest: string
      }
    }
  | {
      readonly type: 'quote-mismatch'
      readonly quote: string
    }
  | { readonly type: 'stale-base' }
  | { readonly type: 'valid' }

type ChatShellFixtures = {
  scenario: ChatScenario
  chatHarness: ChatShellHarness
  chatPage: Page
}

export type ChatShellHarness = {
  readonly url: string
  readonly workspace: {
    readonly runId: string
    readonly runRoot: string
    readonly seedDigest: string
    readonly workspaceRoot: string
  }
  readonly calls: () => readonly ProductRuntimeCall[]
  readonly failClosedProposalCases: () => readonly FailClosedProposalCase[]
  readonly requests: () => readonly string[]
  readWorkspaceBytes(relativePath: string): Promise<Buffer>
  disconnectAssignmentStream(): Promise<void>
  pauseReviewContinuation(): void
  prepareScanLimitWorkspaceActivation(): Promise<void>
  releaseReviewContinuation(): void
  releaseInterruptResponse(): void
  releaseInterruptSettlement(): void
  releaseLateInteraction(): void
  releaseSemanticTurn(): void
  requestSemanticReview(summary?: string): Promise<{
    readonly status: number
    readonly body: unknown
  }>
  restartServer(): Promise<void>
  stopServer(): Promise<void>
  close(): Promise<void>
}

export type StartChatShellHarnessOptions = {
  readonly semesterWorkspace?: E2eSemesterWorkspace
}

const chatShellRoot = fileURLToPath(new URL('../', import.meta.url))
const packageRoot = fileURLToPath(new URL('../../../', import.meta.url))
const heldFrontendConnectionPath = '/__e2e__/hold-frontend-connection'

export const sourceConflictMaterialBytes = Buffer.from(
  [
    '문제해결글쓰기 공지',
    '',
    '개요 작성하기 과제 마감은 2026년 7월 12일 23:59 KST(Asia/Seoul)입니다.',
    'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
    '주제는 수업 시간에 다룬 사회 문제 중 하나를 선택하면 됩니다.',
    '제출 방식과 평가 기준은 강의계획서를 확인하세요.',
    '담당 교원이 이 안내를 현재 내용으로 수정했습니다.',
    '',
  ].join('\n'),
  'utf8',
)

export const storeConflictCourseName = '외부에서 채택할 문제해결글쓰기'

export const invalidWorkspaceStoreBytes = Buffer.from([
  0x7b,
  0x22,
  0x66,
  0x6f,
  0x72,
  0x6d,
  0x61,
  0x74,
  0x56,
  0x65,
  0x72,
  0x73,
  0x69,
  0x6f,
  0x6e,
  0x22,
  0x3a,
  0xc3,
  0x28,
  0x7d,
])

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

export async function holdChatShellFrontendConnection(
  page: Page,
  frontendUrl: string,
): Promise<void> {
  await page.evaluate(async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Expected the held frontend response.')
    const frontendWindow = globalThis as typeof globalThis & {
      heldChatShellFrontendResponse?: Response
    }
    frontendWindow.heldChatShellFrontendResponse = response
  }, new URL(heldFrontendConnectionPath, frontendUrl).href)
}

export async function prepareDurableRestartBaseline(
  page: Page,
): Promise<ProductBootstrap> {
  await selectCanonicalMaterials(page)
  const action = page.getByRole('button', {
    name: /선택한 자료 정리하기/u,
  })

  await action.click()
  await page
    .getByRole('region', { name: '검토 대기' })
    .getByRole('button', { name: '수락' })
    .click()
  await expect(page.locator('[data-product-operation-phase]')).toHaveAttribute(
    'data-product-operation-phase',
    'completed',
  )
  const confirmed = await readProductBootstrap(page)

  await expect(action).toBeEnabled()
  await action.click()
  await expect(page.getByRole('region', { name: '검토 대기' })).toBeVisible()
  await expect(page.locator('[data-product-operation-phase]')).toHaveAttribute(
    'data-product-operation-phase',
    'awaiting-review',
  )
  return confirmed
}

export async function readProductBootstrap(
  page: Page,
): Promise<ProductBootstrap> {
  return page.evaluate(async () => {
    const response = await fetch('/api/product/bootstrap')
    if (!response.ok) throw new Error('Product bootstrap failed.')
    return response.json() as Promise<ProductBootstrap>
  })
}

export async function startChatShellHarness(
  scenario: ChatScenario,
  options: StartChatShellHarnessOptions = {},
): Promise<ChatShellHarness> {
  const frontendServer = createHttpServer()
  let viteServer: ViteDevServer | undefined
  let application: ServerApplication | undefined
  let runtime: ProductE2eRuntime | undefined
  let semesterWorkspace: E2eSemesterWorkspace | undefined
  let selectedWorkspaceRoot: string | undefined
  const requests: string[] = []
  const assignmentStreams = new Set<ServerResponse>()
  const runtimeGenerations: ProductE2eRuntime[] = []
  let interactionCredentials:
    | { readonly token: string; readonly binding: string }
    | undefined
  const ownsSemesterWorkspace = options.semesterWorkspace === undefined

  try {
    semesterWorkspace =
      options.semesterWorkspace ?? (await materializeE2eSemesterWorkspace())
    const activeSemesterWorkspace = semesterWorkspace
    selectedWorkspaceRoot = semesterWorkspace.workspaceRoot
    process.stdout.write(
      `E2E SemesterWorkspace: ${semesterWorkspace.workspaceRoot}\n`,
    )
    const appDataRoot = path.join(semesterWorkspace.runRoot, 'app-data')
    await mkdir(appDataRoot)
    if (scenario === 'invalid-store') {
      const productRoot = path.join(semesterWorkspace.workspaceRoot, '.ay-ple')
      await mkdir(productRoot)
      await writeFile(
        path.join(productRoot, 'workspace-state.json'),
        invalidWorkspaceStoreBytes,
      )
    }
    const semesterWorkspaceBootstrap = {
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => selectedWorkspaceRoot ?? null,
    }
    frontendServer.listen(0, '127.0.0.1')
    await once(frontendServer, 'listening')
    const frontendUrl = serverUrl(frontendServer)

    const createAndActivateApplication = async (): Promise<ServerApplication> => {
      let nextRuntime: ProductE2eRuntime | undefined
      let nextApplication: ServerApplication
      if (scenario === 'unavailable') {
        nextApplication = await createServerApplication({
          semesterWorkspace: semesterWorkspaceBootstrap,
        })
      } else {
        nextRuntime = new ProductE2eRuntime(
          scenario === 'not-ready'
            ? { state: 'not_ready', reason: 'authentication_required' }
            : { state: 'ready' },
          scenario,
          activeSemesterWorkspace.workspaceRoot,
          activeSemesterWorkspace.runId,
        )
        runtimeGenerations.push(nextRuntime)
        nextApplication = await createServerApplication({
          codexChat: {
            ...codexChatIdentity,
            origin: frontendUrl,
            createRuntime: async () => nextRuntime!,
          },
          semesterWorkspace: semesterWorkspaceBootstrap,
          ...(scenario === 'semantic-review'
            ? {
                internalInteractionTarget: {
                  workspaceRoot: activeSemesterWorkspace.workspaceRoot,
                  onReady(credentials: {
                    readonly token: string
                    readonly binding: string
                  }) {
                    interactionCredentials = credentials
                  },
                },
              }
            : {}),
        })
      }

      const activation = await nextApplication.semesterWorkspace?.activate()
      if (
        activation?.status === 'activated' &&
        activation.workspace.state === 'ready' &&
        activation.workspace.course === null
      ) {
        await nextApplication.semesterWorkspace?.createCourse('문제해결글쓰기')
      }
      if (scenario === 'fail-closed-oracle') {
        const snapshot = nextApplication.semesterWorkspace?.snapshot()
        assert.equal(snapshot?.state, 'ready')
        if (snapshot?.state !== 'ready') {
          throw new Error('Expected a ready fail-closed test workspace.')
        }
        const negativeControl = snapshot.materials.find(
          ({ relativePath }) => relativePath === 'unselected-control.txt',
        )
        assert.ok(negativeControl)
        assert.ok(nextRuntime)
        nextRuntime.scriptFailClosedProposals([
          {
            type: 'unselected-evidence',
            material: {
              id: negativeControl.id,
              digest: negativeControl.digest,
            },
          },
          {
            type: 'quote-mismatch',
            quote: '선택한 원문에 존재하지 않는 제목 근거',
          },
          { type: 'stale-base' },
          { type: 'valid' },
        ])
      }
      runtime = nextRuntime
      return nextApplication
    }

    const initialApplication = await createAndActivateApplication()
    const initialListener = await listenToServerApplication(
      initialApplication,
      {
        host: '127.0.0.1',
        port: 0,
      },
    )
    application = initialListener.application
    const apiPort = initialListener.port
    const apiUrl = `http://127.0.0.1:${apiPort}`
    viteServer = await createViteServer({
      appType: 'spa',
      configFile: false,
      root: chatShellRoot,
      plugins: [react()],
      server: {
        hmr: false,
        middlewareMode: true,
        proxy: {
          '/api': {
            target: apiUrl,
            configure(proxy) {
              proxy.on('proxyRes', (_proxyResponse, request, response) => {
                const pathname = new URL(
                  request.url ?? '/',
                  frontendUrl,
                ).pathname
                if (
                  request.method !== 'POST' ||
                  pathname !== '/api/product/actions/first-assignment'
                ) {
                  return
                }
                assignmentStreams.add(response)
                response.once('close', () => {
                  assignmentStreams.delete(response)
                })
              })
            },
          },
        },
      },
    })
    frontendServer.on('request', (request, response) => {
      const pathname = new URL(request.url ?? '/', frontendUrl).pathname
      if (pathname === heldFrontendConnectionPath) {
        response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
        response.write('held')
        return
      }
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
      workspace: {
        runId: semesterWorkspace.runId,
        runRoot: semesterWorkspace.runRoot,
        seedDigest: semesterWorkspace.seedDigest,
        workspaceRoot: semesterWorkspace.workspaceRoot,
      },
      calls: () => runtimeGenerations.flatMap((generation) => generation.calls),
      failClosedProposalCases: () =>
        runtimeGenerations.flatMap(
          (generation) => generation.failClosedProposalCases,
        ),
      requests: () => [...requests],
      async readWorkspaceBytes(relativePath) {
        const candidate = path.resolve(
          semesterWorkspace!.workspaceRoot,
          relativePath,
        )
        const relative = path.relative(
          semesterWorkspace!.workspaceRoot,
          candidate,
        )
        assert.ok(
          relative !== '' &&
            relative !== '..' &&
            !relative.startsWith(`..${path.sep}`),
          'Expected a relative path inside the E2E SemesterWorkspace.',
        )
        return readFile(candidate)
      },
      async disconnectAssignmentStream() {
        const response = [...assignmentStreams].find(
          (candidate) => !candidate.destroyed,
        )
        assert.ok(response, 'Expected a pending Assignment stream response.')
        const closed = once(response, 'close')
        response.destroy()
        await closed
      },
      pauseReviewContinuation() {
        if (!runtime) throw new Error('E2E product runtime is unavailable')
        runtime.pauseReviewContinuation()
      },
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
      releaseSemanticTurn() {
        if (!runtime) throw new Error('E2E product runtime is unavailable')
        runtime.releaseSemanticTurn()
      },
      async requestSemanticReview(
        summary = '마감 정보를 정리합니다.',
      ): Promise<{ readonly status: number; readonly body: unknown }> {
        if (!interactionCredentials) {
          throw new Error('Interaction target credentials are unavailable')
        }
        const headers = {
          'content-type': 'application/json',
          authorization: `Bearer ${interactionCredentials.token}`,
          'x-ay-ple-runtime-binding': interactionCredentials.binding,
        }
        const evidenceBytes = await readFile(
          path.join(
            activeSemesterWorkspace.workspaceRoot,
            'problem-solving-syllabus.txt',
          ),
        )
        const evidenceDigest = createHash('sha256')
          .update(evidenceBytes)
          .digest('hex')
        const handshake = await fetch(
          `${apiUrl}/api/_private/interaction-mcp/`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              protocolVersion: 1,
              kind: 'handshake',
              serverName: 'ay_ple_interaction',
              capabilities: ['propose_state_patch'],
            }),
          },
        )
        assert.equal(handshake.status, 200)
        const response = await fetch(
          `${apiUrl}/api/_private/interaction-mcp/`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              protocolVersion: 1,
              kind: 'capability_call',
              capability: 'propose_state_patch',
              request: {
                summary,
                question: '이 변경 방향을 반영할까요?',
                changes: [
                  {
                    label: '마감',
                    description: '강의계획서의 마감을 반영합니다.',
                    before: '미정',
                    after: '2026-08-03 23:59',
                    evidence: [
                      {
                        relativePath: 'problem-solving-syllabus.txt',
                        contentDigest: evidenceDigest,
                        locator: {
                          type: 'text_quote',
                          quote: 'LMS 과제함 업로드',
                          occurrence: 1,
                        },
                      },
                    ],
                  },
                ],
              },
            }),
          },
        )
        return {
          status: response.status,
          body: await response.json(),
        }
      },
      releaseReviewContinuation() {
        if (!runtime) throw new Error('E2E product runtime is unavailable')
        runtime.releaseReviewContinuation()
      },
      releaseInterruptResponse() {
        if (!runtime) throw new Error('E2E product runtime is unavailable')
        runtime.releaseInterruptResponse()
      },
      releaseInterruptSettlement() {
        if (!runtime) throw new Error('E2E product runtime is unavailable')
        runtime.releaseInterruptSettlement()
      },
      async restartServer() {
        const previousApplication = application
        if (!previousApplication) {
          throw new Error('E2E Server application is unavailable')
        }
        await previousApplication.close()
        const nextApplication = await createAndActivateApplication()
        const nextListener = await listenToServerApplication(nextApplication, {
          host: '127.0.0.1',
          port: apiPort,
        })
        application = nextListener.application
      },
      async stopServer() {
        const previousApplication = application
        if (!previousApplication) return
        application = undefined
        await previousApplication.close()
      },
      async close() {
        if (closed) return
        closed = true
        await cleanupHarnessResources({
          frontendServer,
          viteServer,
          application,
          semesterWorkspace: ownsSemesterWorkspace
            ? semesterWorkspace
            : undefined,
        })
      },
    }
  } catch (error) {
    await cleanupHarnessResources({
      frontendServer,
      viteServer,
      application,
      semesterWorkspace: ownsSemesterWorkspace ? semesterWorkspace : undefined,
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

class ProductE2eRuntime implements CodexWorkspaceRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  private readonly callLog: ProductRuntimeCall[] = []
  private readonly failClosedProposalCaseLog: FailClosedProposalCase[] = []
  private readonly threadInputs: StartThreadInput[] = []
  private readonly pendingInteractions = new Map<string, PendingInteraction>()
  private readonly interruptedTurns = new Set<string>()
  private readonly activeTurns = new Set<Deferred<void>>()
  private readonly interruptObserved = deferred<void>()
  private readonly interruptResponseReleased = deferred<void>()
  private readonly interruptSettlementReleased = deferred<void>()
  private readonly lateInteractionReleased = deferred<void>()
  private readonly reviewContinuationReleased = deferred<void>()
  private failClosedProposalScript:
    | readonly FailClosedProposalScriptCase[]
    | undefined
  private reviewContinuationPaused = false
  private recoveryConflictInjected = false
  private turnOrdinal = 0
  private readonly semanticTurnReleased = deferred<void>()

  constructor(
    private readonly readiness: CodexAccountReadiness,
    private readonly scenario: ProductRuntimeScenario,
    private readonly workspaceRoot: string,
    private readonly runId: string,
  ) {}

  get calls(): readonly ProductRuntimeCall[] {
    return this.callLog.map((call) => structuredClone(call))
  }

  get failClosedProposalCases(): readonly FailClosedProposalCase[] {
    return [...this.failClosedProposalCaseLog]
  }

  scriptFailClosedProposals(
    cases: readonly FailClosedProposalScriptCase[],
  ): void {
    assert.equal(this.scenario, 'fail-closed-oracle')
    assert.equal(this.turnOrdinal, 0)
    assert.equal(this.failClosedProposalScript, undefined)
    this.failClosedProposalScript = structuredClone(cases)
  }

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    this.callLog.push({ operation: 'readAccountReadiness' })
    return { ...this.readiness }
  }

  async readModelCatalog() {
    return {
      models: [
        {
          model: 'gpt-e2e',
          displayName: 'GPT E2E',
          description: 'Deterministic E2E model',
          isDefault: true,
          defaultReasoningEffort: 'medium',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Quick' },
            { reasoningEffort: 'medium', description: 'Balanced' },
          ],
          serviceTiers: ['fast'],
        },
      ],
    }
  }

  async waitForMcpServerReady(
    input: Parameters<CodexWorkspaceRuntime['waitForMcpServerReady']>[0],
  ): Promise<void> {
    input.signal.throwIfAborted()
  }

  async readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }) {
    input.signal.throwIfAborted()
    return {
      projectRootMarkers: [],
      globalInstructionsFile: null,
    }
  }

  async listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }) {
    input.signal.throwIfAborted()
    return []
  }

  async startThread(input?: StartThreadInput) {
    assert.ok(input)
    this.threadInputs.push(structuredClone(input))
    this.callLog.push({ operation: 'startThread', input: structuredClone(input) })
    return { threadId: `thread-private-e2e-${this.runId}` }
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
    const turnId = `turn-private-e2e-${this.runId}-${this.turnOrdinal}`
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
    if (this.scenario === 'reload-before-interrupt-settlement') {
      await this.interruptSettlementReleased.promise
    }
    this.interruptedTurns.add(input.turnId)
    this.interruptObserved.resolve()
    if (this.scenario === 'disconnect-drain-timeout') {
      await this.interruptSettlementReleased.promise
      return
    }
    for (const pending of this.pendingInteractions.values()) {
      if (pending.turnId === input.turnId) {
        pending.settlement.resolve({ resolution: 'cancelled' })
      }
    }
    if (this.scenario === 'acknowledged-interrupt-response-loss') {
      await this.interruptResponseReleased.promise
    }
  }

  async releaseThread(_input: ReleaseThreadInput): Promise<void> {}

  async close(): Promise<void> {
    this.interruptObserved.resolve()
    this.interruptResponseReleased.resolve()
    this.interruptSettlementReleased.resolve()
    this.lateInteractionReleased.resolve()
    this.reviewContinuationReleased.resolve()
    this.semanticTurnReleased.resolve()
    for (const pending of this.pendingInteractions.values()) {
      pending.settlement.resolve({ resolution: 'cancelled' })
    }
    await Promise.all([...this.activeTurns].map((turn) => turn.promise))
  }

  releaseLateInteraction(): void {
    this.lateInteractionReleased.resolve()
  }

  pauseReviewContinuation(): void {
    assert.equal(this.reviewContinuationPaused, false)
    this.reviewContinuationPaused = true
  }

  releaseReviewContinuation(): void {
    this.reviewContinuationReleased.resolve()
  }

  releaseInterruptResponse(): void {
    this.interruptResponseReleased.resolve()
  }

  releaseInterruptSettlement(): void {
    this.interruptSettlementReleased.resolve()
  }

  releaseSemanticTurn(): void {
    this.semanticTurnReleased.resolve()
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
      this.scenario === 'acknowledged-interrupt-response-loss'
    const failClosedOracle = this.scenario === 'fail-closed-oracle'
    const postReviewClarification =
      this.scenario === 'post-review-clarification'
    const interruptObserved = this.interruptObserved.promise
    const interruptSettlementReleased =
      this.interruptSettlementReleased.promise
    const lateInteractionReleased = this.lateInteractionReleased.promise
    const waitForReviewContinuation = this.waitForReviewContinuation.bind(this)
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
        const proposalFailed = await callProposalTool(input.text)
        if (proposalFailed) {
          yield {
            type: 'mcp_call.failed',
            threadId: input.threadId,
            turnId,
            itemId: `mcp-private-${turnId}`,
            tool: 'propose_state_patch',
            displayMessage: 'The product proposal tool failed.',
          }
          if (!failClosedOracle) {
            await interruptObserved
            yield {
              type: 'turn.interrupt_acknowledged',
              threadId: input.threadId,
              turnId,
            }
          }
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId,
            status: 'interrupted',
          }
          return
        }
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
        if (
          postReviewClarification &&
          (finalChoice.type === 'accept' || finalChoice.type === 'reject')
        ) {
          const clarificationInteractionId = `${interactionId}-clarification`
          const clarificationPending = createPending(
            clarificationInteractionId,
            turnId,
          )
          yield {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId,
            itemId: `question-post-review-private-${turnId}`,
            interactionId: clarificationInteractionId,
            questions: [generalQuestion],
          }
          const clarificationSettlement =
            await clarificationPending.settlement.promise
          if (wasInterrupted(turnId)) {
            yield {
              type: 'turn.interrupt_acknowledged',
              threadId: input.threadId,
              turnId,
            }
          }
          yield {
            type: 'user_input.resolved',
            threadId: input.threadId,
            turnId,
            itemId: `question-post-review-private-${turnId}`,
            interactionId: clarificationInteractionId,
            resolution: clarificationSettlement.resolution,
          }
          acknowledge(clarificationInteractionId)
          if (wasInterrupted(turnId)) {
            await interruptSettlementReleased
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
            itemId: `agent-post-review-private-${turnId}`,
            text:
              clarificationSettlement.resolution === 'answered'
                ? '같은 Turn의 답변을 바탕으로 과제 결과를 정리했습니다.'
                : '같은 Turn의 질문을 취소하고 과제 결과를 정리했습니다.',
          }
        }
        await waitForReviewContinuation()
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
      this.scenario === 'acknowledged-interrupt-response-loss'
    const semanticReview = this.scenario === 'semantic-review'
    const semanticTurnReleased = this.semanticTurnReleased.promise
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
        if (semanticReview) {
          await semanticTurnReleased
          if (wasInterrupted(turnId)) {
            yield {
              type: 'turn.interrupt_acknowledged',
              threadId: input.threadId,
              turnId,
            }
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
            text: 'Semantic Review 결과를 바탕으로 정리했습니다.',
          }
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId,
            status: 'completed',
          }
          return
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
  ): Promise<boolean> {
    const threadInput = this.threadInputs[0]
    assert.ok(threadInput)
    if (
      (this.scenario === 'source-conflict' ||
        this.scenario === 'store-conflict') &&
      !this.recoveryConflictInjected
    ) {
      this.recoveryConflictInjected = true
      if (this.scenario === 'source-conflict') {
        await writeFile(
          path.join(this.workspaceRoot, 'lms-outline-notice.txt'),
          sourceConflictMaterialBytes,
        )
      } else {
        const storePath = path.join(
          this.workspaceRoot,
          '.ay-ple',
          'workspace-state.json',
        )
        const store = JSON.parse(
          await readFile(storePath, 'utf8'),
        ) as Record<string, unknown>
        store.course = {
          ...(store.course as Record<string, unknown>),
          displayName: storeConflictCourseName,
        }
        await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`)
      }
    }
    const proposal = proposalFromAssignmentInput(text, overrides)
    if (this.scenario === 'fail-closed-oracle' && !overrides) {
      const scriptedCase =
        this.failClosedProposalScript?.[this.turnOrdinal - 1]
      assert.ok(scriptedCase)
      this.failClosedProposalCaseLog.push(
        applyFailClosedProposalCase(proposal, scriptedCase),
      )
    }
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
          arguments: proposal,
        },
      }),
    })
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      readonly result?: { readonly isError?: boolean }
    }
    if (body.result?.isError === true) {
      assert.ok(
        this.scenario === 'source-conflict' ||
          this.scenario === 'store-conflict' ||
          (this.scenario === 'fail-closed-oracle' && this.turnOrdinal <= 3),
      )
      return true
    }
    assert.equal(body.result?.isError, false)
    return false
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

  private async waitForReviewContinuation(): Promise<void> {
    if (this.reviewContinuationPaused) {
      await this.reviewContinuationReleased.promise
    }
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

function applyFailClosedProposalCase(
  proposal: Record<string, unknown>,
  scriptedCase: FailClosedProposalScriptCase,
): FailClosedProposalCase {
  if (scriptedCase.type === 'valid') return 'valid'

  if (scriptedCase.type === 'stale-base') {
    const baseRevision = proposal.baseRevision
    assert.ok(typeof baseRevision === 'number')
    proposal.baseRevision = baseRevision + 1
    return scriptedCase.type
  }

  const evidence = proposal.evidence
  assert.ok(Array.isArray(evidence))
  const titleEvidence = evidence[0]
  assert.ok(
    typeof titleEvidence === 'object' &&
      titleEvidence !== null &&
      !Array.isArray(titleEvidence),
  )

  if (scriptedCase.type === 'unselected-evidence') {
    Object.assign(titleEvidence, {
      rawMaterialId: scriptedCase.material.id,
      digest: scriptedCase.material.digest,
    })
    return scriptedCase.type
  }

  Object.assign(titleEvidence, { quote: scriptedCase.quote })
  return scriptedCase.type
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
    server.closeAllConnections()
  })
}
