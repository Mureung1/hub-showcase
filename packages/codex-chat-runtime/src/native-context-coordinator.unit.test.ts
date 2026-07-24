import assert from 'node:assert/strict'
import test from 'node:test'

import { CodexChatRuntimeError } from './errors.js'
import {
  NativeContextGenerationCoordinator,
  type NativeContextGenerationCoordinatorOptions,
  type NativeContextProbeRunner,
} from './native-context-coordinator.js'
import {
  NativeContextProbeError,
  type NativeContextProbeSnapshot,
} from './native-context-probe.js'

const FIRST_SNAPSHOT: NativeContextProbeSnapshot = {
  config: {
    projectRootMarkers: ['.git'],
    globalInstructionsFile: '/workspace/AGENTS.md',
  },
  skills: [
    {
      name: 'first-assignment',
      enabled: true,
      sourceRoot: '/workspace/.agents/skills/first-assignment/SKILL.md',
    },
  ],
}

const SECOND_SNAPSHOT: NativeContextProbeSnapshot = {
  config: {
    projectRootMarkers: [],
    globalInstructionsFile: null,
  },
  skills: [
    {
      name: 'semester-ready',
      enabled: true,
      sourceRoot: '/workspace/.agents/skills/semester-ready/SKILL.md',
    },
  ],
}

test('preserves the verifier-issued bundle capability across coordination', async () => {
  const options = probeOptions()
  const coordinator = new NativeContextGenerationCoordinator({
    ...options,
    runProbe: async (probeInput) => {
      assert.equal(probeInput.bundle, options.bundle)
      return FIRST_SNAPSHOT
    },
  })
  const signal = neverAbortedSignal()

  await Promise.all([
    coordinator.readEffectiveConfig({ signal }),
    coordinator.listEffectiveSkills({ signal }),
  ])
})

test('sequential config and Skill reads share one fully-settled generation', async () => {
  let calls = 0
  const coordinator = createCoordinator(async () => {
    calls += 1
    return FIRST_SNAPSHOT
  })
  const signal = neverAbortedSignal()

  const config = await coordinator.readEffectiveConfig({
    signal,
  })
  const skills = await coordinator.listEffectiveSkills({
    signal,
  })

  assert.equal(calls, 1)
  assert.deepEqual(config, FIRST_SNAPSHOT.config)
  assert.deepEqual(skills, FIRST_SNAPSHOT.skills)
  assert.notEqual(config, FIRST_SNAPSHOT.config)
  assert.notEqual(skills, FIRST_SNAPSHOT.skills)
  assert.equal(Object.isFrozen(config), true)
  assert.equal(Object.isFrozen(config.projectRootMarkers), true)
  assert.equal(Object.isFrozen(skills), true)
  assert.equal(Object.isFrozen(skills[0]), true)
})

test('concurrent config and Skill reads share one generation', async () => {
  const result = deferred<NativeContextProbeSnapshot>()
  let calls = 0
  const coordinator = createCoordinator(async () => {
    calls += 1
    return result.promise
  })
  const signal = neverAbortedSignal()

  const config = coordinator.readEffectiveConfig({
    signal,
  })
  const skills = coordinator.listEffectiveSkills({
    signal,
  })
  await Promise.resolve()
  assert.equal(calls, 1)

  result.resolve(FIRST_SNAPSHOT)
  assert.deepEqual(await config, FIRST_SNAPSHOT.config)
  assert.deepEqual(await skills, FIRST_SNAPSHOT.skills)
})

test('overlapping callers correlate generations by their shared signal', async () => {
  const generations = [
    deferred<NativeContextProbeSnapshot>(),
    deferred<NativeContextProbeSnapshot>(),
  ]
  let calls = 0
  const coordinator = createCoordinator(() => {
    const generation = generations[calls]
    calls += 1
    assert.ok(generation)
    return generation.promise
  })
  const firstSignal = neverAbortedSignal()
  const secondSignal = neverAbortedSignal()

  const firstConfig = coordinator.readEffectiveConfig({
    signal: firstSignal,
  })
  const secondConfig = coordinator.readEffectiveConfig({
    signal: secondSignal,
  })
  await Promise.resolve()
  assert.equal(calls, 2)

  generations[1]!.resolve(SECOND_SNAPSHOT)
  assert.deepEqual(await secondConfig, SECOND_SNAPSHOT.config)
  assert.deepEqual(
    await coordinator.listEffectiveSkills({ signal: secondSignal }),
    SECOND_SNAPSHOT.skills,
  )

  generations[0]!.resolve(FIRST_SNAPSHOT)
  assert.deepEqual(await firstConfig, FIRST_SNAPSHOT.config)
  assert.deepEqual(
    await coordinator.listEffectiveSkills({ signal: firstSignal }),
    FIRST_SNAPSHOT.skills,
  )
  assert.equal(calls, 2)
})

test('a completed pair is fresh on the next pair', async () => {
  const snapshots = [FIRST_SNAPSHOT, SECOND_SNAPSHOT]
  let calls = 0
  const coordinator = createCoordinator(async () => {
    const snapshot = snapshots[calls]
    calls += 1
    assert.ok(snapshot)
    return snapshot
  })
  const signal = neverAbortedSignal()

  assert.deepEqual(
    await coordinator.readEffectiveConfig({
      signal,
    }),
    FIRST_SNAPSHOT.config,
  )
  assert.deepEqual(
    await coordinator.listEffectiveSkills({
      signal,
    }),
    FIRST_SNAPSHOT.skills,
  )
  assert.deepEqual(
    await coordinator.listEffectiveSkills({
      signal,
    }),
    SECOND_SNAPSHOT.skills,
  )
  assert.deepEqual(
    await coordinator.readEffectiveConfig({
      signal,
    }),
    SECOND_SNAPSHOT.config,
  )
  assert.equal(calls, 2)
})

test('repeating one side before its pair fails closed without displacing the generation', async () => {
  let calls = 0
  const coordinator = createCoordinator(async () => {
    calls += 1
    return FIRST_SNAPSHOT
  })
  const signal = neverAbortedSignal()

  const firstConfig = await coordinator.readEffectiveConfig({
    signal,
  })
  await assert.rejects(
    () => coordinator.readEffectiveConfig({ signal }),
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_failed',
        message: 'The Codex native context could not be verified.',
      }),
  )
  const pairedSkills = await coordinator.listEffectiveSkills({
    signal,
  })

  assert.deepEqual(firstConfig, FIRST_SNAPSHOT.config)
  assert.deepEqual(pairedSkills, FIRST_SNAPSHOT.skills)
  assert.equal(calls, 1)
})

test('an unpaired settled snapshot expires before a later event-loop turn', async () => {
  const snapshots = [FIRST_SNAPSHOT, SECOND_SNAPSHOT]
  let calls = 0
  const coordinator = createCoordinator(async () => {
    const snapshot = snapshots[calls]
    calls += 1
    assert.ok(snapshot)
    return snapshot
  })
  const signal = neverAbortedSignal()

  assert.deepEqual(
    await coordinator.readEffectiveConfig({
      signal,
    }),
    FIRST_SNAPSHOT.config,
  )
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.deepEqual(
    await coordinator.listEffectiveSkills({
      signal,
    }),
    SECOND_SNAPSHOT.skills,
  )
  assert.equal(calls, 2)
})

test('failed generations are invalidated without poisoning a later pair', async () => {
  let calls = 0
  const coordinator = createCoordinator(async () => {
    calls += 1
    if (calls === 1) throw new Error('raw provider secret')
    return SECOND_SNAPSHOT
  })
  const signal = neverAbortedSignal()

  await assert.rejects(
    () =>
      coordinator.readEffectiveConfig({
        signal,
      }),
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_failed',
        message: 'The Codex native context could not be verified.',
      }),
  )
  const [config, skills] = await Promise.all([
    coordinator.readEffectiveConfig({
      signal,
    }),
    coordinator.listEffectiveSkills({
      signal,
    }),
  ])

  assert.deepEqual(config, SECOND_SNAPSHOT.config)
  assert.deepEqual(skills, SECOND_SNAPSHOT.skills)
  assert.equal(calls, 2)
})

test('a fully reaped shutdown failure stays nonterminal and permits retry', async () => {
  let calls = 0
  const coordinator = createCoordinator(async () => {
    calls += 1
    if (calls === 1) {
      throw new NativeContextProbeError({ code: 'shutdown_failed' })
    }
    return SECOND_SNAPSHOT
  })
  const signal = neverAbortedSignal()

  await assert.rejects(
    () => coordinator.readEffectiveConfig({ signal }),
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_failed',
        message: 'The Codex native context could not be verified.',
      }),
  )
  const [config, skills] = await Promise.all([
    coordinator.readEffectiveConfig({ signal }),
    coordinator.listEffectiveSkills({ signal }),
  ])

  assert.deepEqual(config, SECOND_SNAPSHOT.config)
  assert.deepEqual(skills, SECOND_SNAPSHOT.skills)
  assert.equal(calls, 2)
  await coordinator.close()
})

test('pre-abort spawns nothing and a mid-probe abort permits a fresh generation', async () => {
  let calls = 0
  const coordinator = createCoordinator((options) => {
    calls += 1
    if (calls > 1) return Promise.resolve(SECOND_SNAPSHOT)
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        'abort',
        () => reject(new NativeContextProbeError({ code: 'aborted' })),
        { once: true },
      )
    })
  })
  const preAborted = new AbortController()
  preAborted.abort()

  await assert.rejects(
    () =>
      coordinator.readEffectiveConfig({
        signal: preAborted.signal,
      }),
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_aborted',
        message: 'The Codex native context query was cancelled.',
      }),
  )
  assert.equal(calls, 0)

  const operationController = new AbortController()
  const abortedRead = coordinator.readEffectiveConfig({
    signal: operationController.signal,
  })
  await Promise.resolve()
  assert.equal(calls, 1)
  operationController.abort()
  await assert.rejects(
    () => abortedRead,
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_aborted',
        message: 'The Codex native context query was cancelled.',
      }),
  )

  const freshSignal = neverAbortedSignal()
  const [config, skills] = await Promise.all([
    coordinator.readEffectiveConfig({
      signal: freshSignal,
    }),
    coordinator.listEffectiveSkills({
      signal: freshSignal,
    }),
  ])
  assert.deepEqual(config, SECOND_SNAPSHOT.config)
  assert.deepEqual(skills, SECOND_SNAPSHOT.skills)
  assert.equal(calls, 2)
})

test('close rejects new work, aborts active probes, and waits for cleanup', async () => {
  const cleanup = deferred<void>()
  let probeSignal: AbortSignal | undefined
  const coordinator = createCoordinator(async (options) => {
    probeSignal = options.signal
    await new Promise<void>((resolve) => {
      options.signal.addEventListener('abort', () => resolve(), {
        once: true,
      })
    })
    await cleanup.promise
    throw new NativeContextProbeError({ code: 'aborted' })
  })

  const read = coordinator.readEffectiveConfig({
    signal: neverAbortedSignal(),
  })
  await Promise.resolve()
  assert.equal(probeSignal?.aborted, false)

  let closeSettled = false
  const close = coordinator.close().finally(() => {
    closeSettled = true
  })
  assert.equal(probeSignal?.aborted, true)
  await assert.rejects(
    () =>
      coordinator.listEffectiveSkills({
        signal: neverAbortedSignal(),
      }),
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'runtime_closing',
        message: 'The Codex runtime is closing.',
      }),
  )
  await Promise.resolve()
  assert.equal(closeSettled, false)

  cleanup.resolve()
  await assert.rejects(
    () => read,
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_aborted',
        message: 'The Codex native context query was cancelled.',
      }),
  )
  await close
  assert.equal(closeSettled, true)
  await assert.rejects(
    () =>
      coordinator.readEffectiveConfig({
        signal: neverAbortedSignal(),
      }),
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'runtime_closed',
        message: 'The Codex runtime is closed.',
      }),
  )
})

test('close aborts and awaits every displaced active generation', async () => {
  const cleanups = [deferred<void>(), deferred<void>()]
  const signals: AbortSignal[] = []
  let calls = 0
  const coordinator = createCoordinator(async (options) => {
    const call = calls
    calls += 1
    signals.push(options.signal)
    await new Promise<void>((resolve) => {
      options.signal.addEventListener('abort', () => resolve(), {
        once: true,
      })
    })
    await cleanups[call]!.promise
    throw new NativeContextProbeError({ code: 'aborted' })
  })
  const firstSignal = neverAbortedSignal()
  const secondSignal = neverAbortedSignal()

  const firstRead = coordinator.readEffectiveConfig({
    signal: firstSignal,
  })
  const secondRead = coordinator.readEffectiveConfig({
    signal: secondSignal,
  })
  await Promise.resolve()
  assert.equal(calls, 2)

  let closeSettled = false
  const close = coordinator.close().finally(() => {
    closeSettled = true
  })
  assert.deepEqual(
    signals.map((signal) => signal.aborted),
    [true, true],
  )

  cleanups[0]!.resolve()
  await assert.rejects(
    () => firstRead,
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_aborted',
        message: 'The Codex native context query was cancelled.',
      }),
  )
  await Promise.resolve()
  assert.equal(closeSettled, false)

  cleanups[1]!.resolve()
  await assert.rejects(
    () => secondRead,
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'native_context_aborted',
        message: 'The Codex native context query was cancelled.',
      }),
  )
  await close
  assert.equal(closeSettled, true)
})

test('cleanup failure remains distinguishable to operations and close', async () => {
  const coordinator = createCoordinator(async (options) => {
    await new Promise<void>((resolve) => {
      options.signal.addEventListener('abort', () => resolve(), {
        once: true,
      })
    })
    throw new NativeContextProbeError({ code: 'cleanup_failed' })
  })
  const read = coordinator.readEffectiveConfig({
    signal: neverAbortedSignal(),
  })
  await Promise.resolve()
  const close = coordinator.close()

  for (const operation of [read, close]) {
    await assert.rejects(
      () => operation,
      (error: unknown) =>
        isRuntimeError(error, {
          code: 'runtime_cleanup_failed',
          message:
            'The Codex runtime process tree could not be cleaned up.',
        }),
    )
  }
  await assert.rejects(
    () => coordinator.close(),
    (error: unknown) =>
      isRuntimeError(error, {
        code: 'runtime_cleanup_failed',
        message:
          'The Codex runtime process tree could not be cleaned up.',
      }),
  )
})

function createCoordinator(
  runProbe: NativeContextProbeRunner,
): NativeContextGenerationCoordinator {
  return new NativeContextGenerationCoordinator({
    ...probeOptions(),
    runProbe,
  })
}

function probeOptions(): Omit<
  NativeContextGenerationCoordinatorOptions,
  'runProbe'
> {
  return {
    bundle: {
      bridgeEntrypoint: '/runtime/bridge.py',
      codexPathDirectory: '/runtime/bin',
      nativeExecutable: '/runtime/bin/codex',
      patchStackSha256: 'patch-stack',
      pythonBuild: 'python-build',
      pythonExecutable: '/runtime/bin/python',
      pythonVersion: '3.10.18',
      runtimeBinaryVersion: 'codex-cli 0.144.4',
      runtimeVersion: '0.144.4',
      sitePackages: '/runtime/site-packages',
      sourceCommit: 'source-commit',
    },
    workspace: '/workspace',
    environment: {
      home: '/controlled/home',
      codexHome: '/controlled/codex-home',
      codexSqliteHome: '/controlled/sqlite-home',
      tempDirectory: '/controlled/tmp',
    },
    application: {
      name: 'ay-ple',
      title: 'AY-PLE',
      version: '0.0.1',
    },
  }
}

function neverAbortedSignal(): AbortSignal {
  return new AbortController().signal
}

function isRuntimeError(
  error: unknown,
  expected: { readonly code: string; readonly message: string },
): boolean {
  assert.ok(error instanceof CodexChatRuntimeError)
  assert.equal(error.code, expected.code)
  assert.equal(error.displayMessage, expected.message)
  assert.equal(error.message, expected.message)
  assert.equal(error.unknownOutcome, false)
  return true
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}
