import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { CodexChatRuntimeError } from './index.js'
import { verifyProductionBundle } from './production-bundle.js'
import {
  startVerifiedCodexChatRuntime,
  type SpawnedCodexChatRuntime,
} from './runtime.js'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ARTIFACT_ROOT = join(
  PACKAGE_ROOT,
  '.artifacts',
  'production-runtime-darwin-arm64',
)
const FAKE_APP_SERVER = join(
  PACKAGE_ROOT,
  'scripts',
  'fake_python_bridge_app_server.py',
)

let bundle: Awaited<ReturnType<typeof verifyProductionBundle>>
const roots: string[] = []

before(async () => {
  bundle = await verifyProductionBundle(ARTIFACT_ROOT)
})

after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
})

test('streams one nominal native turn to its authoritative terminal', async () => {
  const harness = await startHarness('nominal')
  try {
    const thread = await harness.runtime.startThread()
    const turn = await harness.runtime.startTurn({
      threadId: thread.threadId,
      text: 'hello nominal',
    })

    assert.deepEqual(
      await collect(turn.events),
      [
        {
          type: 'agent_message.delta',
          threadId: thread.threadId,
          turnId: turn.turnId,
          itemId: `item-${turn.turnId}`,
          delta: 'hello nominal',
        },
        {
          type: 'agent_message.completed',
          threadId: thread.threadId,
          turnId: turn.turnId,
          itemId: `item-${turn.turnId}`,
          text: 'hello nominal',
        },
        {
          type: 'turn.completed',
          threadId: thread.threadId,
          turnId: turn.turnId,
          status: 'completed',
        },
      ],
    )
  } finally {
    await harness.runtime.close()
  }
})

test('preserves response-last native identity and FIFO events through Node', async () => {
  const harness = await startHarness('response-last')
  try {
    const thread = await harness.runtime.startThread()
    assert.deepEqual(thread, { threadId: 'thread-1' })

    const turn = await harness.runtime.startTurn({
      threadId: thread.threadId,
      text: 'response-last',
    })
    assert.equal(turn.threadId, 'thread-1')
    assert.equal(turn.turnId, 'turn-1')
    const events = await collect(turn.events)
    assert.deepEqual(
      events.map((event) => event.type),
      [
        'turn.error',
        'agent_message.delta',
        'agent_message.completed',
        'turn.completed',
      ],
    )
    assert.equal(events.at(-1)?.type, 'turn.completed')
    assert.equal(JSON.stringify({ thread, turn: events }).includes('bridgeRequestId'), false)
  } finally {
    await harness.runtime.close()
  }
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('keeps interrupt correlation separate from the active turn stream', async () => {
  const harness = await startHarness('interrupt')
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startTurn({ threadId, text: 'hold' })
    const eventsPromise = collect(turn.events)

    await harness.runtime.interrupt({ threadId, turnId: turn.turnId })
    assert.deepEqual(await eventsPromise, [
      {
        type: 'turn.completed',
        threadId,
        turnId: turn.turnId,
        status: 'interrupted',
      },
    ])
  } finally {
    await harness.runtime.close()
  }
})

test('snapshots caller-owned inputs before asynchronous correlation', async () => {
  const harness = await startHarness('input-snapshot')
  let closed = false
  try {
    const { threadId } = await harness.runtime.startThread()
    const startInput = { threadId, text: 'hold' }
    const turnPromise = harness.runtime.startTurn(startInput)
    startInput.threadId = 'mutated-thread'
    startInput.text = 'mutated-text'
    const turn = await within(turnPromise)

    const interruptInput = { threadId, turnId: turn.turnId }
    const interruptPromise = harness.runtime.interrupt(interruptInput)
    interruptInput.threadId = 'mutated-thread'
    interruptInput.turnId = 'mutated-turn'
    await within(interruptPromise)
    assert.equal((await collect(turn.events)).at(-1)?.type, 'turn.completed')

    const releaseInput = { threadId }
    const releasePromise = harness.runtime.releaseThread(releaseInput)
    releaseInput.threadId = 'mutated-thread'
    await within(releasePromise)

    await harness.runtime.close()
    closed = true
  } finally {
    if (!closed) {
      harness.child.kill('SIGKILL')
      await harness.closed
    }
  }
})

test('rejects a dispatched mutation as unknown when the bridge dies pre-response', async () => {
  const harness = await startHarness('pre-response-loss')
  await writeFile(join(dirname(harness.journalPath), 'hold-thread-start'), '')
  const pending = harness.runtime.startThread()
  await waitForJournalMethod(harness.journalPath, 'thread/start')
  harness.child.kill('SIGKILL')

  await assert.rejects(
    pending,
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_lost' &&
      error.unknownOutcome,
  )
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('rejects a dispatched mutation as unknown when App Server dies pre-response', async () => {
  const harness = await startHarness('pre-response-app-server-loss')
  await writeFile(join(dirname(harness.journalPath), 'hold-thread-start'), '')
  const pending = harness.runtime.startThread()
  await waitForJournalMethod(harness.journalPath, 'thread/start')
  await killNativeChild(harness.nativeChildPidPath)

  await assert.rejects(
    pending,
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'sdk_transport_failed' &&
      error.unknownOutcome,
  )
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('settles a pending mutation when a correlated result contradicts native scope', async () => {
  const harness = await startHarness('wrong-native-scope')
  const { threadId } = await harness.runtime.startThread()
  await writeFile(join(dirname(harness.journalPath), 'hold-turn-start'), '')
  const pending = harness.runtime.startTurn({ threadId, text: 'held response' })
  await waitForJournalMethod(harness.journalPath, 'turn/start')

  harness.receiveRawForTest(
    Buffer.from(
      '{"type":"result","bridgeRequestId":"bridge-2","command":"start_turn","threadId":"wrong-thread","turnId":"wrong-turn"}\n',
    ),
  )
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed' &&
      error.unknownOutcome,
  )
  assert.equal((await harness.terminal).code, 'bridge_protocol_failed')
  harness.child.kill('SIGKILL')
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('reaps a valid pre-ready fatal before startup rejection escapes', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-bridge-startup-fatal-'))
  roots.push(workspace)
  const journalPath = join(workspace, 'journal.json')
  const nativeChildPidPath = join(workspace, 'native-child.pid')
  await writeFile(join(workspace, 'fail-initialize'), '')

  await assert.rejects(
    startVerifiedCodexChatRuntime({
      bundle,
      workspace,
      launchArgsOverride: [
        bundle.pythonExecutable,
        '-B',
        FAKE_APP_SERVER,
        journalPath,
        nativeChildPidPath,
      ],
      journalPath,
      nativeChildPidPath,
    }),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'sdk_initialization_failed' &&
      !error.unknownOutcome,
  )
  await waitForPidExit(nativeChildPidPath)
})

test('releases only the live bridge projection for a native thread', async () => {
  const harness = await startHarness('release')
  try {
    const thread = await harness.runtime.startThread()
    await harness.runtime.releaseThread(thread)
    await assert.rejects(
      harness.runtime.startTurn({ threadId: thread.threadId, text: 'after release' }),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'unknown_thread' &&
        !error.unknownOutcome,
    )
  } finally {
    await harness.runtime.close()
  }
})

test('ends an accepted stream once with runtime.failed after process loss', async () => {
  const harness = await startHarness('post-response-loss')
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'hold' })
  harness.child.kill('SIGKILL')

  assert.deepEqual(await collect(turn.events), [
    {
      type: 'runtime.failed',
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      mutationOutcomeKnown: true,
    },
  ])
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('ends an accepted stream once when the native App Server is lost', async () => {
  const harness = await startHarness('post-response-app-server-loss')
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'hold' })
  await killNativeChild(harness.nativeChildPidPath)

  assert.deepEqual(await collect(turn.events), [
    {
      type: 'runtime.failed',
      code: 'sdk_transport_failed',
      displayMessage: 'The Codex bridge terminated because its private protocol failed.',
      mutationOutcomeKnown: true,
    },
  ])
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('observes bridge input fatal exactly once without a public raw escape hatch', async () => {
  for (const [label, input, code] of [
    ['unknown', '{"bridgeRequestId":"raw","command":"wat"}\n', 'unknown_command'],
    ['malformed', '{nope}\n', 'malformed_json'],
  ] as const) {
    const harness = await startHarness(label)
    await harness.writeRawForTest(Buffer.from(input))
    const terminal = await harness.terminal
    assert.equal(terminal.code, code)
    assert.equal(terminal.unknownOutcome, false)
    assert.equal(await harness.terminal, terminal)
    await harness.closed
    await waitForPidExit(harness.nativeChildPidPath)
  }
})

test('closes idempotently after the SDK acknowledgement and complete pipe drain', async () => {
  const harness = await startHarness('close')
  await harness.runtime.startThread()
  const first = harness.runtime.close()
  const second = harness.runtime.close()
  await Promise.all([first, second])
  await harness.closed
  assert.equal(harness.child.exitCode, 0)
  assert.equal(harness.child.signalCode, null)
  await assert.rejects(
    harness.runtime.startThread(),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_closed' &&
      !error.unknownOutcome,
  )
  await waitForPidExit(harness.nativeChildPidPath)
})

async function startHarness(label: string): Promise<SpawnedCodexChatRuntime> {
  const workspace = await mkdtemp(join(tmpdir(), `ay-ple-node-bridge-${label}-`))
  roots.push(workspace)
  const journalPath = join(workspace, 'journal.json')
  const nativeChildPidPath = join(workspace, 'native-child.pid')
  return startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    launchArgsOverride: [
      bundle.pythonExecutable,
      '-B',
      FAKE_APP_SERVER,
      journalPath,
      nativeChildPidPath,
    ],
    journalPath,
    nativeChildPidPath,
  })
}

async function collect<T>(values: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = []
  for await (const value of values) collected.push(value)
  return collected
}

async function within<T>(value: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      value,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('operation did not settle')),
          1_000,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function waitForJournalMethod(path: string, method: string): Promise<void> {
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    try {
      const value = JSON.parse(await readFile(path, 'utf8')) as {
        messages?: Array<{ method?: string }>
      }
      if (value.messages?.some((message) => message.method === method)) return
    } catch {
      // The fake publishes its journal atomically; absence is expected while starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error(`Timed out waiting for ${method}`)
}

async function waitForPidExit(path: string): Promise<void> {
  const pid = Number(await readFile(path, 'utf8'))
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return
      throw error
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error(`Native fake child ${pid} did not exit`)
}

async function killNativeChild(path: string): Promise<void> {
  const pid = Number(await readFile(path, 'utf8'))
  process.kill(pid, 'SIGKILL')
}
