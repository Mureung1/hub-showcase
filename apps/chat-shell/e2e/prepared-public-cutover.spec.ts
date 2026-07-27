import {
  mkdtemp,
  realpath,
  rm,
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
  StartThreadInput,
  StartTurnInput,
} from '@ay-ple/codex-chat-runtime'
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
  const runtime = new PreparedBrowserRuntime()
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      origin: 'http://127.0.0.1:4173',
      createRuntime: async () => runtime,
    },
    workspaceRoot,
    readLifecycle: () => ({
      state: 'active',
      workspace: {
        workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
        semester: {
          yearLevel: 2,
          term: { key: 'fall', displayName: '2학기' },
        },
        label: '2학년 2학기',
      },
    }),
  })
  const listener = await bindServerApplicationListener({
    host: '127.0.0.1',
    port: 0,
    requestHandler: target.application.app,
  })
  const apiUrl = `http://127.0.0.1:${listener.port}`
  let vite: ViteDevServer | undefined
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

    await page
      .getByRole('textbox', { name: '메시지', exact: true })
      .fill('과제 파일을 정리해 줘.')
    await page.getByRole('button', { name: '메시지 보내기' }).click()
    await expect(page.getByText('workspace를 확인했습니다.')).toBeVisible()
    expect(runtime.threadInputs).toEqual([undefined])
    expect(runtime.productInputs[0]?.permissionProfile).toBe('workspace_write')
    expect(runtime.productInputs[0]?.skill).toBeUndefined()

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
            },
          ],
        },
      }),
    })
    const card = page.getByRole('region', { name: '검토 대기' })
    await expect(card).toContainText('과제 파일 변경')
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

    runtime.finish()
    await expect(page.locator('[data-product-operation-phase]')).toHaveAttribute(
      'data-product-operation-phase',
      'completed',
    )
  } finally {
    runtime.finish()
    await vite?.close()
    await target.application.close()
    await listener.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

class PreparedBrowserRuntime implements CodexWorkspaceRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  readonly threadInputs: Array<StartThreadInput | undefined> = []
  readonly productInputs: StartProductTurnInput[] = []
  private readonly gate = deferred<void>()

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
      ],
    })
  }

  async startThread(input?: StartThreadInput) {
    this.threadInputs.push(input)
    return { threadId: 'thread-prepared-browser' }
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.productInputs.push(structuredClone(input))
    const gate = this.gate.promise
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
        await gate
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared-browser',
          status: 'completed',
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

  answerUserInput(_input: AnswerUserInput) {
    return Promise.resolve()
  }

  cancelUserInput(_input: CancelUserInput) {
    return Promise.resolve()
  }

  interrupt(_input: InterruptTurnInput) {
    this.finish()
    return Promise.resolve()
  }

  releaseThread(_input: ReleaseThreadInput) {
    return Promise.resolve()
  }

  waitForMcpServerReady() {
    return Promise.resolve()
  }

  readEffectiveConfig() {
    return Promise.resolve({
      projectRootMarkers: [],
      globalInstructionsFile: null,
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
