import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import {
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

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

import { bindServerApplicationListener } from './server-listener.js'
import { createPreparedServerApplication } from './prepared-server-application.js'
import { codexChatIdentity, postJson } from './testing/codex-chat-test-support.js'

test('prepared public composition exposes workspace sources beside AY Chat and inline Review', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-public-server-')),
  )
  const runtime = new PreparedRuntime()
  const lifecycle = {
    state: 'active',
    workspace: {
      workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
      semester: {
        yearLevel: 2,
        term: { key: 'fall', displayName: '2학기' },
      },
      label: '2학년 2학기',
    },
  } as const
  const sourceText = '강의 안내'
  const sourcePdf = Buffer.from('%PDF-1.4\n%%EOF')
  await writeFile(path.join(workspaceRoot, 'assignment.txt'), sourceText)
  await writeFile(path.join(workspaceRoot, 'lecture.pdf'), sourcePdf)
  await writeFile(path.join(workspaceRoot, 'slides.pptx'), 'slides')
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  let lifecycleReader:
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
    },
    workspaceRoot,
    readLifecycle: () => lifecycle,
  })
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const baseUrl = `http://127.0.0.1:${listener.port}`
    const bootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.equal(bootstrap.status, 200)
    assert.deepEqual(await bootstrap.json(), {
      accountReadiness: { state: 'ready' },
      activeOperation: null,
      workspaceLifecycle: lifecycle,
    })
    const sourceList = await fetch(`${baseUrl}/api/product/sources`)
    assert.equal(sourceList.status, 200)
    assert.equal(sourceList.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await sourceList.json(), {
      sources: [
        {
          relativePath: 'assignment.txt',
          size: Buffer.byteLength(sourceText),
          previewKind: 'text',
        },
        {
          relativePath: 'lecture.pdf',
          size: sourcePdf.byteLength,
          previewKind: 'pdf',
        },
        {
          relativePath: 'slides.pptx',
          size: 6,
          previewKind: 'unsupported',
        },
      ],
    })
    const textPreview = await fetch(
      `${baseUrl}/api/product/sources/text?relativePath=assignment.txt`,
    )
    assert.equal(textPreview.status, 200)
    assert.equal(textPreview.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await textPreview.json(), {
      relativePath: 'assignment.txt',
      digest: createHash('sha256').update(sourceText).digest('hex'),
      text: sourceText,
      truncated: false,
    })
    const pdfPreview = await fetch(
      `${baseUrl}/api/product/sources/pdf?relativePath=lecture.pdf`,
    )
    assert.equal(pdfPreview.status, 200)
    assert.equal(pdfPreview.headers.get('content-type'), 'application/pdf')
    assert.equal(pdfPreview.headers.get('cache-control'), 'no-store')
    assert.equal(
      pdfPreview.headers.get('x-content-type-options'),
      'nosniff',
    )
    assert.equal(
      pdfPreview.headers.get('cross-origin-resource-policy'),
      'same-origin',
    )
    assert.equal(
      pdfPreview.headers.get('content-security-policy'),
      "default-src 'none'; frame-ancestors 'self'; sandbox",
    )
    assert.match(
      String(pdfPreview.headers.get('content-disposition')),
      /^inline; filename\*=UTF-8''lecture\.pdf$/u,
    )
    assert.deepEqual(Buffer.from(await pdfPreview.arrayBuffer()), sourcePdf)
    assert.equal(
      (
        await fetch(
          `${baseUrl}/api/product/sources/text?relativePath=..%2Foutside.txt`,
        )
      ).status,
      400,
    )
    for (const path of [
      '/api/product/workspaces/activate',
      '/api/product/courses',
      '/api/product/materials/refresh',
      '/api/product/actions/first-assignment',
      '/api/product/actions/first-assignment/retry',
      '/api/product-mcp',
    ]) {
      assert.equal(
        (await postJson(`${baseUrl}${path}`, {})).status,
        404,
        path,
      )
    }

    assert.equal(
      (
        await postJson(`${baseUrl}/api/product/chat/messages`, {
          text: '과제 파일을 확인해 줘.',
          materials: [],
        })
      ).status,
      400,
    )
    const stream = await postJson(`${baseUrl}/api/product/chat/messages`, {
      text: '과제 파일을 확인해 줘.',
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'default',
      },
    })
    assert.equal(stream.status, 200)
    assert.ok(stream.body)
    const trace = new NdjsonTrace(stream.body.getReader())
    await trace.until((frame) => frame.type === 'operation.accepted')
    const activeBootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.match(
      String(
        (
          (await activeBootstrap.json()) as {
            activeOperation: { operationId: string }
          }
        ).activeOperation.operationId
      ),
      /^operation_[0-9a-f]{32}$/u,
    )
    assert.equal(runtime.startThreadCalls, 1)
    assert.equal(runtime.productInputs[0]?.permissionProfile, 'workspace_write')
    assert.deepEqual(runtime.productInputs[0]?.settings, {
      model: 'gpt-current',
      reasoningEffort: 'medium',
      serviceTier: 'default',
    })
    assert.equal(Object.hasOwn(runtime.productInputs[0] ?? {}, 'skill'), false)
    const busyAction = await postJson(
      `${baseUrl}/api/product/actions`,
      {
        action: 'organize_sources',
        files: [{ relativePath: 'assignment.txt' }],
      },
    )
    assert.equal(busyAction.status, 409)
    assert.deepEqual(await busyAction.json(), {
      code: 'action_busy',
      displayMessage: '다른 AY 작업이 진행 중입니다.',
    })
    assert.equal(runtime.listEffectiveSkillsCalls, 0)

    const headers = {
      authorization: `Bearer ${target.credentials.token}`,
      'x-ay-ple-runtime-binding': target.credentials.binding,
    }
    assert.equal(
      (
        await postJson(
          `${baseUrl}/api/_private/interaction-mcp/`,
          {
            protocolVersion: 1,
            kind: 'handshake',
            serverName: 'ay_ple_interaction',
            capabilities: ['propose_state_patch'],
          },
          headers,
        )
      ).status,
      200,
    )
    lifecycleReader = await openBrokerLifecycle(
      baseUrl,
      target.credentials,
    )
    const held = postJson(
      `${baseUrl}/api/_private/interaction-mcp/`,
      {
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
      },
      headers,
    )
    const requested = await trace.until(
      (frame) => frame.type === 'review.requested',
    )
    const interactionId = String(requested.interactionId)
    const answer = postJson(
      `${baseUrl}/api/product/reviews/${interactionId}`,
      { outcome: 'accept' },
    )
    assert.equal((await held).status, 200)
    assert.equal((await answer).status, 204)
    await trace.until(
      (frame) =>
        frame.type === 'review.resolved' &&
        frame.interactionId === interactionId,
    )
    runtime.finish()
    await trace.until((frame) => frame.type === 'operation.terminal')
    const settledBootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
    assert.equal(
      (
        (await settledBootstrap.json()) as {
          activeOperation: unknown
        }
      ).activeOperation,
      null,
    )
  } finally {
    await target.application.close()
    assert.equal((await lifecycleReader?.read())?.done, true)
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

test('public organize_sources starts one Skill-backed Product operation with ordered current files', async () => {
  const fixture = await createOrganizeSourcesServerFixture(
    'prepared-organize-sources-',
  )
  const {
    baseUrl,
    runtime,
    skillRoot,
    target,
    workspaceRoot,
  } = fixture
  await mkdir(path.join(workspaceRoot, '자료'), { recursive: true })
  await writeFile(path.join(workspaceRoot, '자료', '둘째.txt'), '둘')
  await writeFile(
    path.join(workspaceRoot, '자료', '첫째 "안내".md'),
    '하나',
  )
  runtime.requestGeneralInput = true
  let lifecycleReader:
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined
  try {
    const response = await postJson(
      `${baseUrl}/api/product/actions`,
      {
        action: 'organize_sources',
        files: [
          { relativePath: '자료/둘째.txt' },
          { relativePath: '자료/첫째 "안내".md' },
        ],
        codexSettings: {
          model: 'gpt-current',
          reasoningEffort: 'medium',
          serviceTier: 'default',
        },
      },
    )

    assert.equal(response.status, 200)
    assert.ok(response.body)
    const trace = new NdjsonTrace(response.body.getReader())
    await trace.until((frame) => frame.type === 'operation.preparing')
    const accepted = await trace.until(
      (frame) => frame.type === 'operation.accepted',
    )
    assert.equal(runtime.listEffectiveSkillsCalls, 1)
    assert.deepEqual(runtime.productInputs, [
      {
        threadId: 'thread-prepared',
        permissionProfile: 'workspace_write',
        settings: {
          model: 'gpt-current',
          reasoningEffort: 'medium',
          serviceTier: 'default',
        },
        skill: {
          name: 'ay-ple-first-assignment',
          path: path.join(skillRoot, 'SKILL.md'),
        },
        text: [
          'ActionInvocation: organize_sources',
          'Selected SemesterWorkspace file references:',
          '- "자료/둘째.txt"',
          '- "자료/첫째 \\"안내\\".md"',
        ].join('\n'),
      },
    ])

    const busyChat = await postJson(
      `${baseUrl}/api/product/chat/messages`,
      { text: '동시에 시작할 수 없어야 합니다.' },
    )
    assert.equal(busyChat.status, 409)
    assert.deepEqual(await busyChat.json(), {
      code: 'action_busy',
      displayMessage: '다른 AY 작업이 진행 중입니다.',
    })

    const generalRequest = await trace.until(
      (frame) => frame.type === 'interaction.requested',
    )
    const generalInteractionId = String(generalRequest.interactionId)
    const questions = generalRequest.questions as Array<{
      readonly id: string
    }>
    assert.equal(questions.length, 1)
    const continuation = await postJson(
      [
        `${baseUrl}/api/product/operations`,
        String(accepted.operationId),
        'interactions',
        generalInteractionId,
        'answer',
      ].join('/'),
      {
        answers: {
          [questions[0].id]: ['정리해 주세요.'],
        },
      },
    )
    assert.equal(continuation.status, 202)
    await trace.until(
      (frame) =>
        frame.type === 'interaction.resolved' &&
        frame.interactionId === generalInteractionId,
    )

    const headers = {
      authorization: `Bearer ${target.credentials.token}`,
      'x-ay-ple-runtime-binding': target.credentials.binding,
    }
    assert.equal(
      (
        await postJson(
          `${baseUrl}/api/_private/interaction-mcp/`,
          {
            protocolVersion: 1,
            kind: 'handshake',
            serverName: 'ay_ple_interaction',
            capabilities: ['propose_state_patch'],
          },
          headers,
        )
      ).status,
      200,
    )
    lifecycleReader = await openBrokerLifecycle(
      baseUrl,
      target.credentials,
    )
    const held = postJson(
      `${baseUrl}/api/_private/interaction-mcp/`,
      {
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '자료 정리 결과',
          question: '정리 결과를 반영할까요?',
          changes: [
            {
              label: '자료 순서',
              description: '선택한 자료의 순서를 반영합니다.',
              before: '정리 전',
              after: '정리 후',
            },
          ],
        },
      },
      headers,
    )
    const requested = await trace.until(
      (frame) => frame.type === 'review.requested',
    )
    const interactionId = String(requested.interactionId)
    const answer = postJson(
      `${baseUrl}/api/product/reviews/${interactionId}`,
      { outcome: 'accept' },
    )
    assert.equal((await held).status, 200)
    assert.equal((await answer).status, 204)
    await trace.until(
      (frame) =>
        frame.type === 'review.resolved' &&
        frame.interactionId === interactionId,
    )

    const interrupt = await postJson(
      `${baseUrl}/api/product/operations/${String(accepted.operationId)}/interrupt`,
      {},
    )
    assert.equal(interrupt.status, 202)
    await trace.until((frame) => frame.type === 'operation.terminal')

    const disconnectedAction = await postJson(
      `${baseUrl}/api/product/actions`,
      {
        action: 'organize_sources',
        files: [{ relativePath: '자료/둘째.txt' }],
      },
    )
    assert.equal(disconnectedAction.status, 200)
    assert.ok(disconnectedAction.body)
    const disconnectedTrace = new NdjsonTrace(
      disconnectedAction.body.getReader(),
    )
    await disconnectedTrace.until(
      (frame) => frame.type === 'operation.accepted',
    )
    await disconnectedTrace.cancel()
    await waitForIdleProductOperation(baseUrl)
    assert.equal(runtime.listEffectiveSkillsCalls, 2)
  } finally {
    await fixture.close()
    assert.equal((await lifecycleReader?.read())?.done, true)
  }
})

test('public organize_sources fails before streaming or Turn start with exact safe errors', async () => {
  const fixture = await createOrganizeSourcesServerFixture(
    'prepared-organize-failures-',
  )
  const { baseUrl, runtime, skillRoot, workspaceRoot } = fixture
  const skillPath = path.join(skillRoot, 'SKILL.md')
  await writeFile(path.join(workspaceRoot, 'lecture.pdf'), '%PDF-')
  try {
    const url = `${baseUrl}/api/product/actions`
    const request = (relativePath = 'valid.md') => ({
      action: 'organize_sources',
      files: [{ relativePath }],
    })
    const expectFailure = async (
      body: unknown,
      status: number,
      code: string,
      headers: Record<string, string> = {},
    ) => {
      const response = await postJson(url, body, headers)
      assert.equal(response.status, status)
      assert.match(
        String(response.headers.get('content-type')),
        /^application\/json/u,
      )
      const error = (await response.json()) as {
        code: string
        displayMessage: string
      }
      assert.equal(error.code, code)
      const encoded = JSON.stringify(error)
      assert.equal(encoded.includes(workspaceRoot), false)
      assert.equal(encoded.includes(skillRoot), false)
      assert.equal(encoded.includes('# First Assignment'), false)
    }

    const listCallsBeforeFiles = runtime.listEffectiveSkillsCalls
    await expectFailure(
      request('missing.md'),
      409,
      'action_context_stale',
    )
    await expectFailure(
      request('lecture.pdf'),
      409,
      'action_context_invalid',
    )
    assert.equal(runtime.listEffectiveSkillsCalls, listCallsBeforeFiles)

    runtime.effectiveSkills = []
    await expectFailure(request(), 409, 'action_unavailable')
    runtime.effectiveSkills = [
      {
        name: 'ay-ple-first-assignment',
        enabled: false,
        sourceRoot: skillRoot,
      },
    ]
    await expectFailure(request(), 409, 'action_unavailable')
    runtime.effectiveSkills = [
      {
        name: 'ay-ple-first-assignment',
        enabled: true,
        sourceRoot: path.join(workspaceRoot, 'other-skill'),
      },
    ]
    await expectFailure(request(), 409, 'action_unavailable')

    runtime.effectiveSkills = [
      {
        name: 'ay-ple-first-assignment',
        enabled: true,
        sourceRoot: skillRoot,
      },
    ]
    await rm(skillPath)
    await symlink(path.join(workspaceRoot, 'valid.md'), skillPath)
    await expectFailure(request(), 409, 'action_unavailable')
    await rm(skillPath)
    await writeFile(skillPath, '# First Assignment')

    const movedSkillRoot = path.join(workspaceRoot, 'actual-skill')
    await rename(skillRoot, movedSkillRoot)
    await symlink(movedSkillRoot, skillRoot, 'dir')
    await expectFailure(request(), 409, 'action_unavailable')
    await rm(skillRoot)
    await rename(movedSkillRoot, skillRoot)

    runtime.listEffectiveSkillsError = new Error(
      `unsafe observation ${workspaceRoot}`,
    )
    await expectFailure(request(), 503, 'product_unavailable')
    runtime.listEffectiveSkillsError = undefined

    await expectFailure(
      {
        ...request(),
        codexSettings: {
          model: 'gpt-unknown',
          reasoningEffort: 'medium',
          serviceTier: 'default',
        },
      },
      400,
      'action_invalid',
    )
    runtime.accountReadiness = {
      state: 'not_ready',
      reason: 'authentication_required',
    }
    await expectFailure(request(), 409, 'account_not_ready')
    runtime.accountReadiness = { state: 'ready' }

    await expectFailure(
      { action: 'organize_sources', files: [], skillPath },
      400,
      'invalid_request',
    )
    await expectFailure(
      request(),
      403,
      'forbidden',
      { origin: 'https://hostile.example' },
    )
    assert.deepEqual(runtime.productInputs, [])
  } finally {
    await fixture.close()
  }
})

test('organize_sources preflight rechecks disconnect and aborts on shutdown before Turn start', async () => {
  const fixture = await createOrganizeSourcesServerFixture(
    'prepared-organize-continuity-',
  )
  const { baseUrl, runtime, target } = fixture
  try {
    const actionUrl = `${baseUrl}/api/product/actions`
    const body = JSON.stringify({
      action: 'organize_sources',
      files: [{ relativePath: 'valid.md' }],
    })

    const disconnectGate = deferred<void>()
    const disconnectStarted = deferred<void>()
    runtime.effectiveSkillsGate = disconnectGate
    runtime.effectiveSkillsStarted = disconnectStarted
    const abort = new AbortController()
    const disconnectedRequest = fetch(actionUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: abort.signal,
    })
    await disconnectStarted.promise
    abort.abort()
    disconnectGate.resolve()
    await assert.rejects(
      disconnectedRequest,
      (error: unknown) =>
        error instanceof Error && error.name === 'AbortError',
    )
    await waitForIdleProductOperation(baseUrl)
    assert.deepEqual(runtime.productInputs, [])

    const shutdownGate = deferred<void>()
    const shutdownStarted = deferred<void>()
    runtime.effectiveSkillsGate = shutdownGate
    runtime.effectiveSkillsStarted = shutdownStarted
    const shutdownRequest = fetch(actionUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
    await shutdownStarted.promise
    const shuttingDown = target.appShutdown()
    await shuttingDown
    const shutdownResponse = await shutdownRequest
    assert.equal(runtime.effectiveSkillsSignal?.aborted, true)
    assert.equal(shutdownResponse.status, 503)
    assert.deepEqual(await shutdownResponse.json(), {
      code: 'product_unavailable',
      displayMessage: 'AY 작업공간을 사용할 수 없습니다.',
    })
    assert.deepEqual(runtime.productInputs, [])
  } finally {
    await fixture.close()
  }
})

test('workspace source reads require loopback local-host and same-site admission', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-source-admission-')),
  )
  const runtime = new PreparedRuntime()
  await writeFile(path.join(workspaceRoot, 'assignment.txt'), 'assignment')
  await writeFile(path.join(workspaceRoot, 'lecture.pdf'), '%PDF-1.4\n%%EOF')
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      origin: 'http://127.0.0.1:4173',
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
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
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const baseUrl = `http://127.0.0.1:${listener.port}`
    for (const sourceUrl of [
      `${baseUrl}/api/product/sources`,
      `${baseUrl}/api/product/sources/text?relativePath=assignment.txt`,
      `${baseUrl}/api/product/sources/pdf?relativePath=lecture.pdf`,
    ]) {
      assert.equal((await fetch(sourceUrl)).status, 200, sourceUrl)

      const hostileOrigin = await fetch(sourceUrl, {
        headers: { origin: 'https://hostile.example' },
      })
      assert.equal(hostileOrigin.status, 403, sourceUrl)
      assert.deepEqual(await hostileOrigin.json(), {
        code: 'forbidden',
        displayMessage: '이 요청은 local AY-PLE에서만 사용할 수 있습니다.',
      })

      assert.equal(
        await getStatusWithHeaders(sourceUrl, {
          host: 'hostile.example',
          origin: 'http://127.0.0.1:4173',
        }),
        403,
        sourceUrl,
      )
      assert.equal(
        await getStatusWithHeaders(sourceUrl, {
          host: '127.0.0.1:4173',
          origin: 'http://127.0.0.1:4173',
          'sec-fetch-site': 'same-site',
        }),
        200,
        sourceUrl,
      )

      const crossSite = await fetch(sourceUrl, {
        headers: {
          origin: 'http://127.0.0.1:4173',
          'sec-fetch-site': 'cross-site',
        },
      })
      assert.equal(crossSite.status, 403, sourceUrl)

      const allowedOrigin = await fetch(sourceUrl, {
        headers: {
          origin: 'http://127.0.0.1:4173',
          'sec-fetch-site': 'same-site',
        },
      })
      assert.equal(allowedOrigin.status, 200, sourceUrl)
      assert.equal(
        allowedOrigin.headers.get('access-control-allow-origin'),
        'http://127.0.0.1:4173',
      )
    }
  } finally {
    await target.application.close()
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

async function getStatusWithHeaders(
  url: string,
  headers: Readonly<Record<string, string>>,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const request = httpRequest(url, { headers }, (response) => {
      const status = response.statusCode ?? 0
      response.resume()
      response.once('end', () => resolve(status))
    })
    request.once('error', reject)
    request.end()
  })
}

test('prepared Adapter loss preserves transport_failed through the public Review stream', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-adapter-loss-')),
  )
  const runtime = new PreparedRuntime()
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
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
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  let lifecycleReader:
    | ReadableStreamDefaultReader<Uint8Array>
    | undefined
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const baseUrl = `http://127.0.0.1:${listener.port}`
    const stream = await postJson(`${baseUrl}/api/product/chat/messages`, {
      text: '과제 파일을 확인해 줘.',
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'default',
      },
    })
    assert.equal(stream.status, 200)
    assert.ok(stream.body)
    const trace = new NdjsonTrace(stream.body.getReader())
    await trace.until((frame) => frame.type === 'operation.accepted')

    const headers = {
      authorization: `Bearer ${target.credentials.token}`,
      'x-ay-ple-runtime-binding': target.credentials.binding,
    }
    assert.equal(
      (
        await postJson(
          `${baseUrl}/api/_private/interaction-mcp/`,
          {
            protocolVersion: 1,
            kind: 'handshake',
            serverName: 'ay_ple_interaction',
            capabilities: ['propose_state_patch'],
          },
          headers,
        )
      ).status,
      200,
    )
    lifecycleReader = await openBrokerLifecycle(
      baseUrl,
      target.credentials,
    )
    const held = postJson(
      `${baseUrl}/api/_private/interaction-mcp/`,
      {
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request: {
          summary: '연결 종료 검증',
          question: '이 변경을 반영할까요?',
          changes: [
            {
              label: '상태',
              description: 'Adapter 연결 종료 사유를 검증합니다.',
              before: '연결됨',
              after: '종료됨',
            },
          ],
        },
      },
      headers,
    )
    const requested = await trace.until(
      (frame) => frame.type === 'review.requested',
    )
    const closing = target.adapterLost()
    const failed = await trace.until(
      (frame) =>
        frame.type === 'review.failed' &&
        frame.interactionId === requested.interactionId,
    )
    assert.equal(failed.reason, 'transport_failed')
    const heldResponse = await held
    assert.equal(heldResponse.status, 503)
    assert.equal(
      (
        (await heldResponse.json()) as {
          code: string
        }
      ).code,
      'interaction_interrupted',
    )
    await closing
    assert.equal((await lifecycleReader.read()).done, true)
  } finally {
    await target.appShutdown()
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

test('prepared public composition rejects settings outside the advertised catalog', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-public-settings-')),
  )
  const runtime = new PreparedRuntime()
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: async () => runtime,
      acquireProductThread: async (actualRuntime) =>
        (await actualRuntime.startThread()).threadId,
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
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const baseUrl = `http://127.0.0.1:${listener.port}`
    for (const codexSettings of [
      {
        model: 'gpt-unknown',
        reasoningEffort: 'medium',
        serviceTier: 'default',
      },
      {
        model: 'gpt-current',
        reasoningEffort: 'unknown',
        serviceTier: 'default',
      },
      {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'fast',
      },
    ] as const) {
      const response = await postJson(
        `${baseUrl}/api/product/chat/messages`,
        {
          text: '과제 파일을 확인해 줘.',
          codexSettings,
        },
      )
      assert.equal(response.status, 400)
    }
    assert.equal(runtime.productInputs.length, 0)
  } finally {
    await target.application.close()
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

test('Codex settings fail closed without starting Runtime while the workspace is unavailable', async () => {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-settings-recovery-')),
  )
  let runtimeRequested = false
  const target = await createPreparedServerApplication({
    codexChat: {
      ...codexChatIdentity,
      createRuntime: () => {
        runtimeRequested = true
        return new Promise<CodexWorkspaceRuntime>(() => undefined)
      },
      acquireProductThread: async () => {
        throw new Error('Product thread must not be requested')
      },
    },
    workspaceRoot,
    readLifecycle: () => ({
      state: 'recovery_required',
      workspace: null,
      reason: 'runtime_unavailable',
      displayMessage: 'Runtime을 사용할 수 없습니다.',
    }),
  })
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  try {
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
    const response = await fetch(
      `http://127.0.0.1:${listener.port}/api/product/codex-settings`,
      { signal: AbortSignal.timeout(1_000) },
    )
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      code: 'workspace_unavailable',
      displayMessage: 'AY 작업공간을 사용할 수 없습니다.',
    })
    assert.equal(
      (
        await fetch(
          `http://127.0.0.1:${listener.port}/api/product/sources`,
        )
      ).status,
      503,
    )
    assert.equal(runtimeRequested, false)
  } finally {
    await target.application.close()
    await listener?.close({ signal: new AbortController().signal })
    await rm(workspaceRoot, { force: true, recursive: true })
  }
})

async function createOrganizeSourcesServerFixture(prefix: string) {
  const workspaceRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), prefix)),
  )
  const runtime = new PreparedRuntime()
  const skillRoot = path.join(
    workspaceRoot,
    '.agents',
    'skills',
    'ay-ple-first-assignment',
  )
  await mkdir(skillRoot, { recursive: true })
  await writeFile(path.join(skillRoot, 'SKILL.md'), '# First Assignment')
  await writeFile(path.join(workspaceRoot, 'valid.md'), 'valid')
  runtime.effectiveSkills = [
    {
      name: 'ay-ple-first-assignment',
      enabled: true,
      sourceRoot: skillRoot,
    },
  ]

  let target:
    | Awaited<ReturnType<typeof createPreparedServerApplication>>
    | undefined
  let listener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  try {
    target = await createPreparedServerApplication({
      codexChat: {
        ...codexChatIdentity,
        createRuntime: async () => runtime,
        acquireProductThread: async (actualRuntime) =>
          (await actualRuntime.startThread()).threadId,
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
    listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: target.application.app,
    })
  } catch (error) {
    await target?.appShutdown().catch(() => undefined)
    await listener
      ?.close({ signal: new AbortController().signal })
      .catch(() => undefined)
    await rm(workspaceRoot, { force: true, recursive: true })
    throw error
  }

  let closePromise: Promise<void> | undefined
  return {
    baseUrl: `http://127.0.0.1:${listener.port}`,
    runtime,
    skillRoot,
    target,
    workspaceRoot,
    close() {
      closePromise ??= (async () => {
        try {
          await target.appShutdown()
        } finally {
          try {
            await listener.close({
              signal: new AbortController().signal,
            })
          } finally {
            await rm(workspaceRoot, { force: true, recursive: true })
          }
        }
      })()
      return closePromise
    },
  }
}

class PreparedRuntime implements CodexWorkspaceRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  startThreadCalls = 0
  readonly productInputs: StartProductTurnInput[] = []
  effectiveSkills: Array<{
    readonly name: string
    readonly enabled: boolean
    readonly sourceRoot: string
  }> = []
  listEffectiveSkillsCalls = 0
  listEffectiveSkillsError?: Error
  effectiveSkillsGate?: ReturnType<typeof deferred<void>>
  effectiveSkillsStarted?: ReturnType<typeof deferred<void>>
  effectiveSkillsSignal?: AbortSignal
  requestGeneralInput = false
  accountReadiness:
    | { readonly state: 'ready' }
    | {
      readonly state: 'not_ready'
        readonly reason: 'authentication_required'
      } = { state: 'ready' }
  private turnGate = deferred<void>()
  private readonly generalInputGate = deferred<void>()
  private generalInputResolution: 'answered' | 'cancelled' = 'answered'

  readAccountReadiness() {
    return Promise.resolve(this.accountReadiness)
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

  async startThread() {
    this.startThreadCalls += 1
    return { threadId: 'thread-prepared' }
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.productInputs.push(structuredClone(input))
    const gate = this.turnGate.promise
    const runtime = this
    return {
      threadId: input.threadId,
      turnId: 'turn-prepared',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        yield {
          type: 'agent_message.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared',
          itemId: 'item-prepared',
          text: '작업을 확인했습니다.',
        }
        if (runtime.requestGeneralInput) {
          yield {
            type: 'user_input.requested',
            threadId: input.threadId,
            turnId: 'turn-prepared',
            itemId: 'item-general-input',
            interactionId: 'native-general-input',
            questions: [
              {
                id: 'native-question',
                header: '자료 정리',
                question: '자료를 어떤 기준으로 정리할까요?',
                options: null,
                acceptsFreeform: true,
              },
            ],
          }
          await runtime.generalInputGate.promise
          yield {
            type: 'user_input.resolved',
            threadId: input.threadId,
            turnId: 'turn-prepared',
            itemId: 'item-general-input',
            interactionId: 'native-general-input',
            resolution: runtime.generalInputResolution,
          }
        }
        await gate
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-prepared',
          status: 'completed',
        }
      })(),
    }
  }

  finish() {
    const current = this.turnGate
    this.turnGate = deferred<void>()
    current.resolve()
  }

  startTurn(_input: StartTurnInput): Promise<never> {
    return Promise.reject(new Error('legacy turn is not expected'))
  }

  answerUserInput(_input: AnswerUserInput) {
    this.generalInputResolution = 'answered'
    this.generalInputGate.resolve()
    return Promise.resolve()
  }

  cancelUserInput(_input: CancelUserInput) {
    this.generalInputResolution = 'cancelled'
    this.generalInputGate.resolve()
    return Promise.resolve()
  }

  interrupt(_input: InterruptTurnInput) {
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

  async listEffectiveSkills(input: { readonly signal: AbortSignal }) {
    this.listEffectiveSkillsCalls += 1
    this.effectiveSkillsSignal = input.signal
    this.effectiveSkillsStarted?.resolve()
    input.signal.throwIfAborted()
    if (this.listEffectiveSkillsError) {
      throw this.listEffectiveSkillsError
    }
    if (this.effectiveSkillsGate) {
      await waitForSignalOrPromise(
        this.effectiveSkillsGate.promise,
        input.signal,
      )
    }
    return structuredClone(this.effectiveSkills)
  }

  close() {
    this.finish()
    return Promise.resolve()
  }
}

class NdjsonTrace {
  private readonly frames: Array<Record<string, unknown>> = []
  private buffer = ''

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {}

  async until(
    predicate: (frame: Record<string, unknown>) => boolean,
  ): Promise<Record<string, unknown>> {
    for (;;) {
      const found = this.frames.find(predicate)
      if (found) return found
      const next = await this.reader.read()
      if (next.done) throw new Error('NDJSON stream ended before target frame')
      this.buffer += new TextDecoder().decode(next.value, { stream: true })
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line) this.frames.push(JSON.parse(line))
      }
    }
  }

  cancel(): Promise<void> {
    return this.reader.cancel()
  }
}

async function openBrokerLifecycle(
  baseUrl: string,
  credentials: { readonly token: string; readonly binding: string },
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetch(
    `${baseUrl}/api/_private/interaction-mcp/`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credentials.token}`,
        'content-type': 'application/json',
        'x-ay-ple-runtime-binding': credentials.binding,
      },
      body: JSON.stringify({
        protocolVersion: 1,
        kind: 'lifecycle_open',
      }),
    },
  )
  assert.equal(response.status, 200)
  assert.ok(response.body)
  const reader = response.body.getReader()
  const accepted = await reader.read()
  assert.equal(accepted.done, false)
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(accepted.value)),
    {
      protocolVersion: 1,
      kind: 'lifecycle_accepted',
    },
  )
  return reader
}

async function waitForIdleProductOperation(baseUrl: string): Promise<void> {
  const deadline = Date.now() + 1_000
  for (;;) {
    const response = await fetch(`${baseUrl}/api/product/bootstrap`)
    const bootstrap = (await response.json()) as {
      readonly activeOperation: unknown
    }
    if (bootstrap.activeOperation === null) return
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for the Product operation lease')
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

function waitForSignalOrPromise(
  promise: Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', onAbort)
    const onAbort = () => {
      cleanup()
      reject(signal.reason)
    }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
    void promise.then(
      () => {
        cleanup()
        resolve()
      },
      (error: unknown) => {
        cleanup()
        reject(error)
      },
    )
  })
}

function deferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value?: T) => void
} {
  let resolve!: (value?: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
