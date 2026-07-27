import assert from 'node:assert/strict'
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { ProposeStatePatchRequest } from '@ay-ple/interaction-mcp'
import type { ProductReviewFrame, ProductReviewResult } from '@ay-ple/product-contract'
import express from 'express'

import {
  createInteractionBroker,
  type InteractionBroker,
} from '../interaction-broker.js'
import {
  createProductTurnCoordinator,
  type ProductTurnCoordinator,
  type ProductTurnLease,
} from '../product-turn-coordinator.js'

const execFileAsync = promisify(execFile)
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
)
const bootstrapScript = path.join(
  repositoryRoot,
  '.agents/skills/semester-workspace-init/scripts/bootstrap.mts',
)
const initialAssignment = [
  '# 첫 과제',
  '',
  '마감: 미정',
  '제출: 미정',
  '',
].join('\n')
const acceptedAssignment = [
  '# 첫 과제',
  '',
  '마감: 2026-08-03 23:59',
  '제출: LMS 과제함',
  '',
].join('\n')
const syllabus = [
  '# 문제해결글쓰기',
  '',
  '첫 과제 마감은 2026-08-03 23:59입니다.',
  '제출 방식은 LMS 과제함입니다.',
  '',
].join('\n')

test(
  'traces a bootstrapped Git SemesterWorkspace through Review and AY-owned checkpoint',
  { timeout: 60_000 },
  async () => {
    const fixture = await prepareWorkspace()
    try {
      await assertBootstrapOutput(fixture)
      const original = await mutationSnapshot(fixture.workspaceRoot)
      const proposal = reviewRequest(fixture.syllabusDigest)
      const nominal = await startProductTrace(fixture.workspaceRoot)
      try {
        const reviseCall = nominal.adapter.callTool(proposal)
        const first = await nominal.nextRequested()
        await assertUnchanged(fixture.workspaceRoot, original)
        await nominal.broker.settle(first.interactionId, {
          outcome: 'revise',
          feedback: '제출 방식을 더 분명하게 써 주세요.',
        })
        assert.deepEqual(await toolResult(reviseCall), {
          outcome: 'revise',
          feedback: '제출 방식을 더 분명하게 써 주세요.',
        })

        const acceptCall = nominal.adapter.callTool({
          ...proposal,
          summary: '피드백을 반영해 과제 정보를 다시 정리합니다.',
          changes: proposal.changes.map((change) => ({
            ...change,
            description: `${change.description} 제출 위치를 명시합니다.`,
          })),
        })
        const second = await nominal.nextRequested()
        assert.notEqual(second.interactionId, first.interactionId)
        assert.equal(
          nominal.frames.some(
            (frame) =>
              frame.type === 'review.resolved' &&
              frame.interactionId === first.interactionId &&
              frame.result.outcome === 'revise',
          ),
          true,
        )
        await assertUnchanged(fixture.workspaceRoot, original)
        await nominal.broker.settle(second.interactionId, {
          outcome: 'accept',
        })
        assert.deepEqual(await toolResult(acceptCall), { outcome: 'accept' })
        await assertUnchanged(fixture.workspaceRoot, original)

        await applyAcceptedChange(fixture.workspaceRoot)
        await assertAcceptedCheckpoint(fixture)
        const accepted = await mutationSnapshot(fixture.workspaceRoot)

        const rejectCall = nominal.adapter.callTool({
          ...proposal,
          summary: '추가 변경을 제안합니다.',
        })
        const third = await nominal.nextRequested()
        await nominal.broker.settle(third.interactionId, {
          outcome: 'reject',
          feedback: '추가 변경은 하지 않습니다.',
        })
        assert.deepEqual(await toolResult(rejectCall), {
          outcome: 'reject',
          feedback: '추가 변경은 하지 않습니다.',
        })
        await assertUnchanged(fixture.workspaceRoot, accepted)
        assertBrowserSafe(nominal, fixture.workspaceRoot)
      } finally {
        await nominal.close('native_terminal')
      }

      await assertEvidenceAndBusyFailures(fixture)
      await assertContinuityFailures(fixture)
      await assertNoCredentialResidue(fixture.workspaceRoot)
    } finally {
      await fixture.cleanup()
    }
  },
)

type WorkspaceFixture = {
  readonly root: string
  readonly workspaceRoot: string
  readonly initialScaffoldHead: string
  readonly syllabusDigest: string
  cleanup(): Promise<void>
}

async function prepareWorkspace(): Promise<WorkspaceFixture> {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-prepared-product-')),
  )
  const workspaceRoot = path.join(root, 'semester-workspace')
  const outside = path.join(root, 'outside-evidence.txt')
  await mkdir(workspaceRoot)
  await git(workspaceRoot, ['init', '--quiet'])
  await git(workspaceRoot, ['config', 'user.name', 'AY-PLE Product Trace'])
  await git(workspaceRoot, ['config', 'user.email', 'trace@ay-ple.invalid'])
  await Promise.all([
    writeFile(path.join(workspaceRoot, 'assignment.md'), initialAssignment),
    writeFile(path.join(workspaceRoot, 'syllabus.txt'), syllabus),
    writeFile(path.join(workspaceRoot, 'dirty-sentinel.txt'), 'tracked\n'),
    writeFile(outside, 'outside evidence\n'),
  ])
  await git(workspaceRoot, [
    'add',
    '--',
    'assignment.md',
    'syllabus.txt',
    'dirty-sentinel.txt',
  ])
  await git(workspaceRoot, ['commit', '--quiet', '-m', 'chore: seed semester files'])
  await Promise.all([
    writeFile(path.join(workspaceRoot, 'dirty-sentinel.txt'), 'user dirty change\n'),
    writeFile(path.join(workspaceRoot, 'untracked-sentinel.txt'), 'untracked\n'),
    symlink(outside, path.join(workspaceRoot, 'escape-link.txt')),
  ])

  const firstBootstrap = await runBootstrap(workspaceRoot)
  assert.match(
    firstBootstrap,
    new RegExp(
      `Prepared SemesterWorkspace: ${escapeRegex(await realpath(workspaceRoot))}`,
    ),
  )
  assert.match(firstBootstrap, /Scaffold checkpoint: updated/)
  assert.match(firstBootstrap, /Material baseline: not-requested/)
  assert.match(
    firstBootstrap,
    new RegExp(
      `npm run dev -- --workspace ${escapeRegex(JSON.stringify(workspaceRoot))}`,
    ),
  )
  const initialScaffoldHead = await gitText(workspaceRoot, ['rev-parse', 'HEAD'])
  const rerun = await runBootstrap(workspaceRoot)
  assert.match(rerun, /Scaffold checkpoint: no-op/)
  assert.match(rerun, /Material baseline: not-requested/)
  assert.equal(
    await gitText(workspaceRoot, ['rev-parse', 'HEAD']),
    initialScaffoldHead,
  )
  return {
    root,
    workspaceRoot,
    initialScaffoldHead,
    syllabusDigest: sha256(Buffer.from(syllabus)),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

async function runBootstrap(workspaceRoot: string): Promise<string> {
  return (
    await execFileAsync(
      process.execPath,
      [
        '--import',
        'tsx',
        bootstrapScript,
        '--target',
        workspaceRoot,
        '--year-level',
        '2',
        '--term-key',
        'fall',
        '--term-display-name',
        '2학기',
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
      },
    )
  ).stdout
}

async function assertBootstrapOutput(fixture: WorkspaceFixture): Promise<void> {
  const state = JSON.parse(
    await readFile(
      path.join(fixture.workspaceRoot, 'workspace-state.json'),
      'utf8',
    ),
  ) as Record<string, unknown>
  assert.equal(state.kind, 'ay-ple.semester-workspace')
  assert.equal(state.formatVersion, 4)
  assert.match(String(state.workspaceId), /^workspace_[0-9a-f]{32}$/)
  assert.deepEqual(state.semester, {
    yearLevel: 2,
    term: { key: 'fall', displayName: '2학기' },
  })

  const config = await readFile(
    path.join(fixture.workspaceRoot, '.codex/config.toml'),
    'utf8',
  )
  assert.match(config, /\[mcp_servers\.ay_ple_interaction\]/)
  assert.match(config, /enabled_tools = \["propose_state_patch"\]/)
  assert.match(config, /required = true/)
  assert.doesNotMatch(config, /cwd|tool_timeout_sec|Bearer|runtime_[0-9a-f]{32}/)
  const command = requireAdapterCommand(config)
  assert.equal(path.isAbsolute(command), false)
  assert.equal(
    await realpath(path.resolve(fixture.workspaceRoot, command)),
    await realpath(
      path.join(repositoryRoot, 'packages/interaction-mcp/dist/stdio.js'),
    ),
  )
  assert.deepEqual(
    await readFile(
      path.join(
        fixture.workspaceRoot,
        '.agents/skills/ay-ple-first-assignment/SKILL.md',
      ),
    ),
    await readFile(
      path.join(repositoryRoot, 'skills/ay-ple-first-assignment/SKILL.md'),
    ),
  )
  assert.match(
    await readFile(path.join(fixture.workspaceRoot, 'AGENTS.md'), 'utf8'),
    /frequent, meaningful Git commits/,
  )
  assert.deepEqual(
    (await gitText(fixture.workspaceRoot, [
      'show',
      '--pretty=format:',
      '--name-only',
      fixture.initialScaffoldHead,
    ]))
      .split('\n')
      .filter(Boolean)
      .sort(),
    [
      '.agents/skills/ay-ple-first-assignment/SKILL.md',
      '.codex/config.toml',
      'AGENTS.md',
      'workspace-state.json',
    ],
  )
}

function reviewRequest(contentDigest: string): ProposeStatePatchRequest {
  return {
    summary: '첫 과제 정보를 정리합니다.',
    question: '이 변경을 실제 과제 파일에 반영할까요?',
    changes: [
      {
        label: '마감',
        description: '강의계획서의 마감을 반영합니다.',
        before: '미정',
        after: '2026-08-03 23:59',
        evidence: [
          {
            relativePath: 'syllabus.txt',
            contentDigest,
            locator: {
              type: 'text_quote',
              quote: '첫 과제 마감은 2026-08-03 23:59입니다.',
              occurrence: 1,
            },
          },
        ],
      },
      {
        label: '제출 방식',
        description: '강의계획서의 제출 방식을 반영합니다.',
        before: '미정',
        after: 'LMS 과제함',
        evidence: [
          {
            relativePath: 'syllabus.txt',
            contentDigest,
            locator: {
              type: 'text_quote',
              quote: '제출 방식은 LMS 과제함입니다.',
              occurrence: 1,
            },
          },
        ],
      },
    ],
  }
}

type ProductTrace = {
  readonly adapter: AdapterClient
  readonly broker: InteractionBroker
  readonly coordinator: ProductTurnCoordinator
  readonly frames: ProductReviewFrame[]
  readonly interruptCount: () => number
  readonly teardownCount: () => number
  nextRequested(): Promise<Extract<ProductReviewFrame, { type: 'review.requested' }>>
  close(authority: 'native_terminal' | 'runtime_closed'): Promise<void>
}

let operationSequence = 0

async function startProductTrace(workspaceRoot: string): Promise<ProductTrace> {
  operationSequence += 1
  const operationId = `operation_${operationSequence.toString(16).padStart(32, '0')}`
  const coordinator = createProductTurnCoordinator({
    assertEligible() {},
  })
  const lease = coordinator.claimProductTurn({ operationId })
  assert.equal(coordinator.markProductTurnStarted(lease), true)
  const frames: ProductReviewFrame[] = []
  let interrupts = 0
  let teardowns = 0
  const activeTurn = () => {
    const active = coordinator.activeOperation()
    return active
      ? {
          operationId: active.operationId,
          nativeThreadId: 'private-native-thread',
          nativeTurnId: 'private-native-turn',
        }
      : undefined
  }
  const broker = await createInteractionBroker({
    workspaceRoot,
    activeProductTurn: activeTurn,
    uiAdapter: {
      publish(frame) {
        frames.push(frame)
      },
    },
    interruptProductTurn() {
      interrupts += 1
    },
    teardownRuntime() {
      teardowns += 1
    },
  })
  const server = createServer(
    express().use('/api/_private/interaction-mcp', broker.router),
  )
  await listen(server)
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const credentials = broker.credentials()
  const config = await readFile(
    path.join(workspaceRoot, '.codex/config.toml'),
    'utf8',
  )
  const adapter = startAdapter({
    command: path.resolve(workspaceRoot, requireAdapterCommand(config)),
    cwd: workspaceRoot,
    brokerUrl:
      `http://127.0.0.1:${address.port}/api/_private/interaction-mcp`,
    credentials,
  })
  try {
    await adapter.initialize()
    assert.deepEqual(await adapter.listTools(), ['propose_state_patch'])
  } catch (error) {
    await adapter.close()
    await closeServer(server)
    coordinator.release(lease, 'runtime_closed')
    throw error
  }
  let requestedCursor = 0
  return {
    adapter,
    broker,
    coordinator,
    frames,
    interruptCount: () => interrupts,
    teardownCount: () => teardowns,
    async nextRequested() {
      await waitFor(
        () =>
          frames.filter((frame) => frame.type === 'review.requested').length >
          requestedCursor,
      )
      const requested = frames.filter(
        (frame): frame is Extract<
          ProductReviewFrame,
          { type: 'review.requested' }
        > => frame.type === 'review.requested',
      )[requestedCursor]
      assert.ok(requested)
      requestedCursor += 1
      return requested
    },
    close: (authority) =>
      closeProductTrace({
        adapter,
        broker,
        coordinator,
        lease,
        server,
        authority,
      }),
  }
}

async function closeProductTrace(input: {
  readonly adapter: AdapterClient
  readonly broker: InteractionBroker
  readonly coordinator: ProductTurnCoordinator
  readonly lease: ProductTurnLease
  readonly server: Server
  readonly authority: 'native_terminal' | 'runtime_closed'
}): Promise<void> {
  await input.broker.appShutdown()
  await input.adapter.close()
  await closeServer(input.server)
  assert.equal(
    input.coordinator.release(input.lease, input.authority),
    true,
  )
  assert.equal(input.coordinator.activeOperation(), null)
}

async function assertEvidenceAndBusyFailures(
  fixture: WorkspaceFixture,
): Promise<void> {
  const trace = await startProductTrace(fixture.workspaceRoot)
  try {
    const baseline = await mutationSnapshot(fixture.workspaceRoot)
    const invalidDigest = await toolResult(
      trace.adapter.callTool(reviewRequest('0'.repeat(64))),
      true,
    )
    assert.equal(invalidDigest, undefined)
    assert.equal(trace.frames.length, 0)
    await assertUnchanged(fixture.workspaceRoot, baseline)

    const quoteDrift = reviewRequest(fixture.syllabusDigest)
    assert.equal(
      await toolResult(
        trace.adapter.callTool({
          ...quoteDrift,
          changes: quoteDrift.changes.map((change) => ({
            ...change,
            evidence: change.evidence?.map((evidence) => ({
              ...evidence,
              locator: {
                ...evidence.locator,
                quote: `${evidence.locator.quote} drift`,
              },
            })),
          })),
        }),
        true,
      ),
      undefined,
    )
    assert.equal(trace.frames.length, 0)

    const invalidReference = reviewRequest(fixture.syllabusDigest)
    assert.equal(
      await toolResult(
        trace.adapter.callTool({
          ...invalidReference,
          changes: invalidReference.changes.map((change) => ({
            ...change,
            evidence: change.evidence?.map((evidence) => ({
              ...evidence,
              relativePath: '../outside-evidence.txt',
            })),
          })),
        }),
        true,
      ),
      undefined,
    )
    assert.equal(trace.frames.length, 0)

    const escaped = reviewRequest(sha256(Buffer.from('outside evidence\n')))
    const escapedCall = trace.adapter.callTool({
      ...escaped,
      changes: escaped.changes.map((change) => ({
        ...change,
        evidence: [
          {
            ...change.evidence![0],
            relativePath: 'escape-link.txt',
            contentDigest: sha256(Buffer.from('outside evidence\n')),
            locator: {
              type: 'text_quote',
              quote: 'outside evidence',
              occurrence: 1,
            },
          },
        ],
      })),
    })
    assert.equal(await toolResult(escapedCall, true), undefined)
    assert.equal(trace.frames.length, 0)

    const held = trace.adapter.callTool(reviewRequest(fixture.syllabusDigest))
    await trace.nextRequested()
    const busy = trace.adapter.callTool(reviewRequest(fixture.syllabusDigest))
    assert.equal(await toolResult(busy, true), undefined)
    assert.equal(
      trace.frames.filter((frame) => frame.type === 'review.requested').length,
      1,
    )
    assert.equal(await trace.broker.turnInterrupted(), true)
    assert.equal(await toolResult(held, true), undefined)
    assert.equal(trace.interruptCount(), 1)
    assert.deepEqual(trace.frames.at(-1), {
      type: 'review.failed',
      operationId: trace.coordinator.activeOperation()?.operationId,
      interactionId: (
        trace.frames[0] as Extract<
          ProductReviewFrame,
          { type: 'review.requested' }
        >
      ).interactionId,
      reason: 'turn_interrupted',
    })
    assert.notEqual(trace.coordinator.activeOperation(), null)
    await assertUnchanged(fixture.workspaceRoot, baseline)
  } finally {
    await trace.close('native_terminal')
  }
}

async function assertContinuityFailures(
  fixture: WorkspaceFixture,
): Promise<void> {
  for (const scenario of [
    'browser_disconnect',
    'runtime_terminal',
    'adapter_loss',
  ] as const) {
    const trace = await startProductTrace(fixture.workspaceRoot)
    const baseline = await mutationSnapshot(fixture.workspaceRoot)
    try {
      const call = trace.adapter.callTool(
        reviewRequest(fixture.syllabusDigest),
      )
      await trace.nextRequested()
      if (scenario === 'browser_disconnect') {
        await trace.broker.browserDisconnected()
        assert.equal(await toolResult(call, true), undefined)
        assert.equal(trace.interruptCount(), 1)
      } else if (scenario === 'runtime_terminal') {
        await trace.broker.runtimeTerminal()
        assert.equal(await toolResult(call, true), undefined)
      } else {
        await trace.adapter.close()
        await trace.broker.adapterLost()
        assert.equal(trace.teardownCount(), 1)
      }
      assert.equal(
        trace.frames.some((frame) => frame.type === 'review.resolved'),
        false,
      )
      assert.equal(trace.frames.at(-1)?.type, 'review.failed')
      assert.notEqual(trace.coordinator.activeOperation(), null)
      await assertUnchanged(fixture.workspaceRoot, baseline)
    } finally {
      await trace.close(
        scenario === 'runtime_terminal' || scenario === 'adapter_loss'
          ? 'runtime_closed'
          : 'native_terminal',
      )
    }
  }
}

type MutationSnapshot = {
  readonly actualBytes: Buffer
  readonly head: string
  readonly index: string
  readonly stateBytes: Buffer
}

async function mutationSnapshot(workspaceRoot: string): Promise<MutationSnapshot> {
  return {
    actualBytes: await readFile(path.join(workspaceRoot, 'assignment.md')),
    head: await gitText(workspaceRoot, ['rev-parse', 'HEAD']),
    index: await gitText(workspaceRoot, ['ls-files', '--stage']),
    stateBytes: await readFile(path.join(workspaceRoot, 'workspace-state.json')),
  }
}

async function assertUnchanged(
  workspaceRoot: string,
  expected: MutationSnapshot,
): Promise<void> {
  const actual = await mutationSnapshot(workspaceRoot)
  assert.deepEqual(actual.actualBytes, expected.actualBytes)
  assert.equal(actual.head, expected.head)
  assert.equal(actual.index, expected.index)
  assert.deepEqual(actual.stateBytes, expected.stateBytes)
}

async function applyAcceptedChange(workspaceRoot: string): Promise<void> {
  await writeFile(path.join(workspaceRoot, 'assignment.md'), acceptedAssignment)
  await git(workspaceRoot, ['add', '--', 'assignment.md'])
  await git(workspaceRoot, [
    'commit',
    '--quiet',
    '--only',
    '-m',
    'feat: record accepted first assignment',
    '--',
    'assignment.md',
  ])
}

async function assertAcceptedCheckpoint(fixture: WorkspaceFixture): Promise<void> {
  assert.equal(
    await readFile(path.join(fixture.workspaceRoot, 'assignment.md'), 'utf8'),
    acceptedAssignment,
  )
  assert.equal(
    await gitText(fixture.workspaceRoot, [
      'show',
      '--pretty=format:',
      '--name-only',
      'HEAD',
    ]),
    'assignment.md',
  )
  assert.equal(
    await gitText(fixture.workspaceRoot, ['log', '-1', '--pretty=%s']),
    'feat: record accepted first assignment',
  )
  assert.equal(
    await readFile(
      path.join(fixture.workspaceRoot, 'dirty-sentinel.txt'),
      'utf8',
    ),
    'user dirty change\n',
  )
  assert.equal(
    await readFile(
      path.join(fixture.workspaceRoot, 'untracked-sentinel.txt'),
      'utf8',
    ),
    'untracked\n',
  )
  assert.equal(
    await gitText(fixture.workspaceRoot, ['diff', '--cached', '--name-only']),
    '',
  )
  const status = await gitText(fixture.workspaceRoot, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ])
  assert.match(status, /^M dirty-sentinel\.txt$/m)
  assert.match(status, /^\?\? escape-link\.txt$/m)
  assert.match(status, /^\?\? untracked-sentinel\.txt$/m)
}

function assertBrowserSafe(trace: ProductTrace, workspaceRoot: string): void {
  const serialized = JSON.stringify(trace.frames)
  const credentials = trace.broker.credentials()
  for (const privateValue of [
    credentials.token,
    credentials.binding,
    workspaceRoot,
    'private-native-thread',
    'private-native-turn',
  ]) {
    assert.equal(serialized.includes(privateValue), false)
  }
  assert.doesNotMatch(
    serialized,
    /courseId|runId|patchId|decisionKey|requestKey|UserConfirmation|RawMaterial/,
  )
}

async function assertNoCredentialResidue(workspaceRoot: string): Promise<void> {
  const trackedFiles = (
    await gitText(workspaceRoot, ['ls-files'])
  ).split('\n').filter(Boolean)
  const trackedText = (
    await Promise.all(
      trackedFiles.map((relativePath) =>
        readFile(path.join(workspaceRoot, relativePath), 'utf8'),
      ),
    )
  ).join('\n')
  assert.doesNotMatch(trackedText, /Bearer [A-Za-z0-9_-]{40,}/)
  assert.doesNotMatch(trackedText, /runtime_[0-9a-f]{32}/)
}

function requireAdapterCommand(config: string): string {
  const match = config.match(/^command = ("(?:[^"\\]|\\.)*")$/m)
  assert.ok(match)
  return JSON.parse(match[1]) as string
}

type JsonRpcResponse = {
  readonly id?: number
  readonly result?: unknown
  readonly error?: unknown
}

type AdapterClient = {
  callTool(request: ProposeStatePatchRequest): Promise<JsonRpcResponse>
  initialize(): Promise<void>
  listTools(): Promise<readonly string[]>
  close(): Promise<void>
}

function startAdapter(options: {
  readonly command: string
  readonly cwd: string
  readonly brokerUrl: string
  readonly credentials: {
    readonly token: string
    readonly binding: string
  }
}): AdapterClient {
  const child = spawn(process.execPath, [options.command], {
    cwd: options.cwd,
    env: {
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      AY_PLE_INTERACTION_BROKER_URL: options.brokerUrl,
      AY_PLE_INTERACTION_BROKER_TOKEN: options.credentials.token,
      AY_PLE_INTERACTION_RUNTIME_BINDING: options.credentials.binding,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const responses = new Map<number, JsonRpcResponse>()
  const waiters = new Map<number, (value: JsonRpcResponse) => void>()
  let requestId = 0
  let buffer = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk
    while (true) {
      const newline = buffer.indexOf('\n')
      if (newline < 0) break
      const line = buffer.slice(0, newline)
      buffer = buffer.slice(newline + 1)
      if (line.length === 0) continue
      const response = JSON.parse(line) as JsonRpcResponse
      assert.equal(typeof response.id, 'number')
      const id = response.id as number
      const waiter = waiters.get(id)
      if (waiter) {
        waiters.delete(id)
        waiter(response)
      } else {
        responses.set(id, response)
      }
    }
  })

  const request = (method: string, params: unknown): Promise<JsonRpcResponse> => {
    requestId += 1
    const id = requestId
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    const response = responses.get(id)
    if (response) {
      responses.delete(id)
      return Promise.resolve(response)
    }
    return new Promise((resolve) => waiters.set(id, resolve))
  }
  return {
    async initialize() {
      const response = await request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'prepared-product-trace', version: '1' },
      })
      assert.equal(response.error, undefined)
      assert.equal(
        (response.result as { protocolVersion: string }).protocolVersion,
        '2025-06-18',
      )
    },
    async listTools() {
      const response = await request('tools/list', {})
      assert.equal(response.error, undefined)
      return (response.result as { tools: { name: string }[] }).tools.map(
        ({ name }) => name,
      )
    },
    callTool(review) {
      return request('tools/call', {
        name: 'propose_state_patch',
        arguments: review,
      })
    },
    close: () => closeChild(child),
  }
}

async function toolResult(
  response: Promise<JsonRpcResponse>,
  expectError = false,
): Promise<ProductReviewResult | undefined> {
  const value = await response
  assert.equal(value.error, undefined)
  const result = value.result as {
    readonly isError: boolean
    readonly structuredContent?: ProductReviewResult
  }
  assert.equal(result.isError, expectError)
  return result.structuredContent
}

async function closeChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.stdin.end()
  await Promise.race([
    new Promise<void>((resolve) => child.once('exit', () => resolve())),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        child.kill('SIGKILL')
        resolve()
      }, 2_000).unref()
    }),
  ])
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

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for product trace evidence')
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

async function git(root: string, args: readonly string[]): Promise<void> {
  await execFileAsync('/usr/bin/git', ['-C', root, ...args])
}

async function gitText(root: string, args: readonly string[]): Promise<string> {
  return (
    await execFileAsync('/usr/bin/git', ['-C', root, ...args], {
      encoding: 'utf8',
    })
  ).stdout.trim()
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
