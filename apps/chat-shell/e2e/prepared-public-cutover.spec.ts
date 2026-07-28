import { createHash } from 'node:crypto'
import {
  mkdtemp,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  AnswerUserInput,
  CancelUserInput,
  CodexChatRuntimeError,
  CodexProductActivity,
  CodexProductTurn,
  CodexWorkspaceRuntime,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartProductTurnInput,
  StartTurnInput,
} from '@ay-ple/codex-chat-runtime'
import type { ProductWorkspaceLifecycle } from '@ay-ple/product-contract'
import react from '@vitejs/plugin-react'
import { expect, test } from 'playwright/test'
import {
  createServer as createViteServer,
  type ViteDevServer,
} from 'vite'

import { createPreparedServerApplication } from '../../server/src/prepared-server-application.js'
import { bindServerApplicationListener } from '../../server/src/server-listener.js'
import { codexChatIdentity } from '../../server/src/testing/codex-chat-test-support.js'

const chatShellRoot = fileURLToPath(new URL('../', import.meta.url))

test('default Browser opens prepared AY Chat and settles inline Semantic Review without academic controls', async ({
  page,
}) => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-public-browser-')),
  )
  const evidenceText =
    '강의계획서 안내: 마감은 8월 3일입니다. LMS에서 제출해 주세요.'
  const evidenceQuote = '마감은 8월 3일입니다.'
  const evidenceDigest = createHash('sha256')
    .update(evidenceText)
    .digest('hex')
  await writeFile(path.join(workspaceRoot, 'assignment.txt'), evidenceText)
  const runtime = new PreparedBrowserRuntime()
  let lifecycle: ProductWorkspaceLifecycle = {
    state: 'active',
    workspace: {
      workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
      semester: {
        yearLevel: 2,
        term: { key: 'fall', displayName: '2학기' },
      },
      label: '2학년 2학기',
    },
  }
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      origin: 'http://127.0.0.1:4173',
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
    workspaceRoot,
    readLifecycle: () => lifecycle,
  })
  const listener = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: target.application.app,
  })
  const apiUrl = `http://127.0.0.1:${listener.port}`
  let vite: ViteDevServer | undefined
  let lifecycleReader:
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined
  try {
    vite = await createViteServer({
      appType: 'spa',
      configFile: false,
      root: chatShellRoot,
      plugins: [react()],
      server: {
        hmr: false,
        host: '127.0.0.1',
        port: 4173,
        strictPort: true,
        proxy: { '/api': { target: apiUrl } },
      },
    })
    await vite.listen()
    const url = vite.resolvedUrls?.local[0]
    if (!url) throw new Error('Prepared Browser URL is missing')
    await page.goto(url)

    await expect(page.getByRole('complementary', { name: 'AY Chat' })).toBeVisible()
    await expect(page.getByText('2학년 2학기', { exact: true })).toBeVisible()
    await expect(page.getByRole('complementary', { name: '학기 자료' })).toHaveCount(0)
    await expect(page.getByText('과목을 준비해 주세요')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /자료/u })).toHaveCount(0)
    await expect(page.getByLabel('Fast mode')).toBeDisabled()
    await page.getByLabel('Codex 모델').selectOption('gpt-fast')
    await page.getByLabel('추론 강도').selectOption('high')
    await page.getByLabel('Fast mode').check()

    await page
      .getByRole('textbox', { name: '메시지', exact: true })
      .fill('과제 파일을 정리해 줘.')
    await page.getByRole('button', { name: '메시지 보내기' }).click()
    await expect(page.getByText('workspace를 확인했습니다.')).toBeVisible()
    expect(runtime.startThreadCalls).toBe(1)
    expect(runtime.productInputs[0]?.permissionProfile).toBe('workspace_write')
    expect(runtime.productInputs[0]?.settings).toEqual({
      model: 'gpt-fast',
      reasoningEffort: 'high',
      serviceTier: 'fast',
    })
    expect(Object.hasOwn(runtime.productInputs[0] ?? {}, 'skill')).toBe(false)
    const activeBootstrap = (await (
      await fetch(`${apiUrl}/api/product/bootstrap`)
    ).json()) as {
      readonly activeOperation: {
        readonly operationId: string
      } | null
    }
    const operationId = activeBootstrap.activeOperation?.operationId
    if (!operationId) throw new Error('Active product operation is missing')
    expect(operationId).toMatch(/^operation_[0-9a-f]{32}$/u)

    const clarification = page.getByRole('region', { name: 'AY 질문' })
    await expect(clarification).toContainText('학기 확인')
    await clarification.getByRole('textbox').fill('2학기')
    const answerRequest = page.waitForRequest((request) =>
      request.url().endsWith('/answer'),
    )
    await clarification.getByRole('button', { name: '답변' }).click()
    expect(new URL((await answerRequest).url()).pathname).toContain(
      `/operations/${operationId}/`,
    )
    await expect(
      page.getByRole('region', { name: '질문 응답 완료' }),
    ).toContainText('학기 확인')
    expect(runtime.answers).toEqual([
      {
        interactionId: 'native-interaction',
        answers: { 'native-question': ['2학기'] },
      },
    ])

    const headers = {
      authorization: `Bearer ${target.credentials.token}`,
      'content-type': 'application/json',
      'x-ay-ple-runtime-binding': target.credentials.binding,
    }
    expect(
      (
        await fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            protocolVersion: 1,
            kind: 'handshake',
            serverName: 'ay_ple_interaction',
            capabilities: ['propose_state_patch'],
          }),
        })
      ).status,
    ).toBe(200)
    const lifecycleResponse = await fetch(
      `${apiUrl}/api/_private/interaction-mcp/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          protocolVersion: 1,
          kind: 'lifecycle_open',
        }),
      },
    )
    expect(lifecycleResponse.status).toBe(200)
    if (!lifecycleResponse.body) {
      throw new Error('Adapter lifecycle response is missing')
    }
    lifecycleReader = lifecycleResponse.body.getReader()
    const lifecycleAccepted = await lifecycleReader.read()
    expect(lifecycleAccepted.done).toBe(false)
    expect(
      JSON.parse(new TextDecoder().decode(lifecycleAccepted.value)),
    ).toEqual({
      protocolVersion: 1,
      kind: 'lifecycle_accepted',
    })
    const held = fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '과제 파일 변경',
          question: '이 변경을 반영할까요?',
          changes: [
            {
              label: '마감',
              description: '마감 정보를 actual file에 반영합니다.',
              before: '미정',
              after: '8월 3일',
              evidence: [
                {
                  relativePath: 'assignment.txt',
                  contentDigest: evidenceDigest,
                  locator: {
                    type: 'text_quote',
                    quote: evidenceQuote,
                    occurrence: 1,
                  },
                },
              ],
            },
          ],
        },
      }),
    })
    const card = page.getByRole('region', { name: '검토 대기' })
    await expect(card).toContainText('과제 파일 변경')
    const evidence = card.locator('figure.semantic-evidence')
    await expect(evidence).toContainText('assignment.txt')
    await expect(evidence).toContainText('occurrence 1')
    await expect(evidence).toContainText(`SHA-256 ${evidenceDigest}`)
    await expect(evidence.locator('blockquote')).toContainText(
      '강의계획서 안내:',
    )
    await expect(evidence.locator('mark')).toHaveText(evidenceQuote)
    await expect(evidence.locator('blockquote')).toContainText(
      'LMS에서 제출해 주세요.',
    )
    await card.getByRole('button', { name: '수락' }).click()
    const heldResponse = await held
    expect(heldResponse.status).toBe(200)
    expect(await heldResponse.json()).toMatchObject({
      kind: 'capability_result',
      result: { outcome: 'accept' },
    })
    const settledCard = page.getByRole('region', { name: '수락됨' })
    await expect(settledCard).toContainText('과제 파일 변경')
    await expect(settledCard.getByRole('button')).toHaveCount(0)

    const reviseHeld = fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '과제 파일 변경 보완',
          question: '보완한 변경을 반영할까요?',
          changes: [
            {
              label: '제출 방식',
              description: '제출 방식을 actual file에 반영합니다.',
              before: '미정',
              after: 'LMS',
            },
          ],
        },
      }),
    })
    const reviseCard = page.getByRole('region', { name: '검토 대기' })
    await expect(reviseCard).toContainText('과제 파일 변경 보완')
    await reviseCard.getByRole('button', { name: '수정 요청' }).click()
    await reviseCard
      .getByRole('textbox', { name: '수정 요청' })
      .fill('제출 위치를 더 구체적으로 적어 줘.')
    await reviseCard.getByRole('button', { name: '수정 요청' }).click()
    expect(await (await reviseHeld).json()).toMatchObject({
      kind: 'capability_result',
      result: {
        outcome: 'revise',
        feedback: '제출 위치를 더 구체적으로 적어 줘.',
      },
    })
    await expect(
      page.getByRole('region', { name: '수정 요청됨' }),
    ).toContainText('과제 파일 변경 보완')

    const rejectHeld = fetch(`${apiUrl}/api/_private/interaction-mcp/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '불필요한 과제 파일 변경',
          question: '이 변경을 반영할까요?',
          changes: [
            {
              label: '메모',
              description: '불필요한 메모를 추가합니다.',
              after: '임시 메모',
            },
          ],
        },
      }),
    })
    const rejectCard = page.getByRole('region', { name: '검토 대기' })
    await expect(rejectCard).toContainText('불필요한 과제 파일 변경')
    await rejectCard.getByRole('button', { name: '거절' }).click()
    expect(await (await rejectHeld).json()).toMatchObject({
      kind: 'capability_result',
      result: { outcome: 'reject' },
    })
    await expect(page.getByRole('region', { name: '거절됨' })).toContainText(
      '불필요한 과제 파일 변경',
    )

    const interruptRequest = page.waitForRequest((request) =>
      request.url().endsWith('/interrupt'),
    )
    await page.getByRole('button', { name: '작업 중단' }).click()
    expect(new URL((await interruptRequest).url()).pathname).toBe(
      `/api/product/operations/${operationId}/interrupt`,
    )
    await expect(page.locator('[data-product-operation-phase]')).toHaveAttribute(
      'data-product-operation-phase',
      'interrupted',
    )
    expect(runtime.interrupts).toHaveLength(1)
    lifecycle = {
      state: 'recovery_required',
      workspace: {
        availability: 'available',
        workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
        semester: {
          yearLevel: 2,
          term: { key: 'fall', displayName: '2학기' },
        },
        label: '2학년 2학기',
      },
      reason: 'runtime_unavailable',
      displayMessage: 'AY Runtime을 다시 시작해 주세요.',
    }
    await expect(page.getByText('AY Runtime을 다시 시작해 주세요.')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'AY Chat' })).toHaveCount(0)
  } finally {
    runtime.finish()
    await vite?.close()
    await target.application.close()
    expect((await lifecycleReader?.read())?.done).toBe(true)
    await listener.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

class PreparedBrowserRuntime implements CodexWorkspaceRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  startThreadCalls = 0
  readonly productInputs: StartProductTurnInput[] = []
  readonly answers: AnswerUserInput[] = []
  readonly interrupts: InterruptTurnInput[] = []
  private readonly clarificationGate = deferred<void>()
  private readonly gate = deferred<void>()
  private interrupted = false

  readAccountReadiness() {
    return Promise.resolve({ state: 'ready' as const })
  }

  readModelCatalog() {
    return Promise.resolve({
      models: [
        {
          model: 'gpt-current',
          displayName: 'GPT Current',
          description: 'Current model',
          isDefault: true,
          defaultReasoningEffort: 'medium',
          supportedReasoningEfforts: [
            { reasoningEffort: 'medium', description: 'Balanced' },
          ],
          serviceTiers: ['default'],
        },
        {
          model: 'gpt-fast',
          displayName: 'GPT Fast',
          description: 'Fast model',
          isDefault: false,
          defaultReasoningEffort: 'low',
          supportedReasoningEfforts: [
            { reasoningEffort: 'low', description: 'Quick' },
            { reasoningEffort: 'high', description: 'Deep' },
          ],
          serviceTiers: ['default', 'fast'],
        },
      ],
    })
  }

  async startThread() {
    this.startThreadCalls += 1
    return { threadId: 'thread-prepared-browser' }
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.productInputs.push(structuredClone(input))
    const clarificationGate = this.clarificationGate.promise
    const turnGate = this.gate.promise
    const wasInterrupted = () => this.interrupted
    return {
      threadId: input.threadId,
      turnId: 'turn-prepared-browser',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          itemId: 'item-prepared-browser',
          text: 'workspace를 확인했습니다.',
        }
        yield {
          type: 'user_input.requested',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          itemId: 'item-clarification',
          interactionId: 'native-interaction',
          questions: [
            {
              id: 'native-question',
              header: '학기 확인',
              question: '어느 학기를 기준으로 할까요?',
              options: null,
              acceptsFreeform: true,
            },
          ],
        }
        await clarificationGate
        yield {
          type: 'user_input.resolved',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          itemId: 'item-clarification',
          interactionId: 'native-interaction',
          resolution: 'answered',
        }
        await turnGate
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          status: wasInterrupted() ? 'interrupted' : 'completed',
        }
      })(),
    }
  }

  finish() {
    this.gate.resolve(undefined)
  }

  startTurn(_input: StartTurnInput): Promise<never> {
    return Promise.reject(new Error('legacy turn is not expected'))
  }

  answerUserInput(input: AnswerUserInput) {
    this.answers.push(structuredClone(input))
    this.clarificationGate.resolve(undefined)
    return Promise.resolve()
  }

  cancelUserInput(_input: CancelUserInput) {
    this.clarificationGate.resolve(undefined)
    return Promise.resolve()
  }

  interrupt(input: InterruptTurnInput) {
    this.interrupted = true
    this.interrupts.push(structuredClone(input))
    this.finish()
    return Promise.resolve()
  }

  releaseThread(_input: ReleaseThreadInput) {
    return Promise.resolve()
  }

  readEffectiveConfig() {
    return Promise.resolve({
      projectRootMarkers: [],
      globalInstructionsFile: null,
      mcpServers: [],
    })
  }

  listEffectiveSkills() {
    return Promise.resolve([])
  }

  close() {
    this.finish()
    return Promise.resolve()
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
