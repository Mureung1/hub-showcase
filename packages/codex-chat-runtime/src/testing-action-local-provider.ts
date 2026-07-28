import {
  mkdtemp,
  realpath,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  startActionLocalProvider,
  type ActionLocalProviderFunctionCall,
  type ActionLocalProviderFunctionOutput,
  type ActionLocalProviderRequest,
} from './action-local-provider-server.js'
import {
  createLocalProviderEnvironment,
  writeLocalProviderConfig,
  waitForProcessGroupExit,
  withinDuration,
} from './local-provider-test-support.js'
import { verifyProductionBundle } from './production-bundle.js'
import {
  startVerifiedCodexChatRuntime,
  type SpawnedCodexChatRuntime,
} from './runtime.js'
import type {
  CodexChildEnvironment,
  CodexWorkspaceRuntime,
} from './runtime-contract.js'

export type CodexActionLocalProviderFunctionCall =
  ActionLocalProviderFunctionCall
export type CodexActionLocalProviderFunctionOutput =
  ActionLocalProviderFunctionOutput

export type CodexActionRuntimeInputItem =
  | {
      readonly type: 'skill'
      readonly name: string
      readonly path: string
    }
  | {
      readonly type: 'text'
      readonly text: string
    }

export type CodexActionLocalProviderJournal = {
  readonly requests: readonly ActionLocalProviderRequest[]
  readonly runtimeProductInputs: ReadonlyArray<
    readonly CodexActionRuntimeInputItem[]
  >
}

export interface CodexActionLocalProviderTestFixture {
  createRuntime(options: {
    readonly childEnvironment: CodexChildEnvironment
  }): Promise<CodexWorkspaceRuntime>
  finish(): Promise<CodexActionLocalProviderJournal>
  dispose(): Promise<void>
}

export async function startCodexActionLocalProviderTestFixture(options: {
  readonly runtimeRoot: string
  readonly workspace: string
}): Promise<CodexActionLocalProviderTestFixture> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const fixtureRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-action-local-provider-')),
  )
  const provider = await startActionLocalProvider()
  let environment
  try {
    environment = await createLocalProviderEnvironment(fixtureRoot)
    await writeLocalProviderConfig(
      environment.codexHome,
      provider.url,
      'Official SDK action local provider',
    )
  } catch (error) {
    await provider.dispose()
    await rm(fixtureRoot, { recursive: true, force: true })
    throw error
  }

  let spawned: SpawnedCodexChatRuntime | undefined
  let exposedRuntime: CodexWorkspaceRuntime | undefined
  let providerJournal: CodexActionLocalProviderJournal | undefined
  const runtimeProductInputs: Array<readonly CodexActionRuntimeInputItem[]> = []
  let disposed = false

  const closeRuntime = async (): Promise<void> => {
    if (!spawned) return
    await spawned.runtime.close()
    await withinDuration(
      spawned.closed,
      10_000,
      'Exact action Runtime did not close',
    )
    await waitForProcessGroupExit(requirePid(spawned.child), 10_000)
  }

  const closeProvider = async (): Promise<CodexActionLocalProviderJournal> => {
    providerJournal ??= {
      requests: await provider.close(),
      runtimeProductInputs: structuredClone(runtimeProductInputs),
    }
    return providerJournal
  }

  return {
    async createRuntime({ childEnvironment }) {
      if (spawned || exposedRuntime) {
        throw new Error('Exact action Runtime fixture may start only once')
      }
      spawned = await startVerifiedCodexChatRuntime({
        bundle,
        workspace: options.workspace,
        environment,
        childEnvironment,
        disableManagedConfigForTest: true,
        deadlines: {
          responseMs: 10_000,
          streamIdleMs: 30_000,
          streamTotalMs: 90_000,
          gracefulCloseMs: 2_000,
          terminateMs: 2_000,
          postKillMs: 2_000,
        },
      })
      let closePromise: Promise<void> | undefined
      const actual = spawned.runtime
      exposedRuntime = {
        terminal: actual.terminal,
        readAccountReadiness: async () => ({ state: 'ready' }),
        readModelCatalog: () => actual.readModelCatalog(),
        readEffectiveConfig: (input) => actual.readEffectiveConfig(input),
        listEffectiveSkills: (input) => actual.listEffectiveSkills(input),
        startThread: () => actual.startThread(),
        startTurn: (input) => actual.startTurn(input),
        startProductTurn: (input) => {
          runtimeProductInputs.push([
            ...(input.skill === undefined
              ? []
              : [
                  {
                    type: 'skill' as const,
                    name: input.skill.name,
                    path: input.skill.path,
                  },
                ]),
            { type: 'text', text: input.text },
          ])
          return actual.startProductTurn(input)
        },
        answerUserInput: (input) => actual.answerUserInput(input),
        cancelUserInput: (input) => actual.cancelUserInput(input),
        interrupt: (input) => actual.interrupt(input),
        releaseThread: (input) => actual.releaseThread(input),
        close: () => {
          closePromise ??= closeRuntime()
          return closePromise
        },
      }
      return exposedRuntime
    },
    async finish() {
      await exposedRuntime?.close()
      return closeProvider()
    },
    async dispose() {
      if (disposed) return
      disposed = true
      const results = await Promise.allSettled([
        exposedRuntime?.close() ?? Promise.resolve(),
        provider.dispose(),
      ])
      await rm(fixtureRoot, { recursive: true, force: true })
      const errors = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        )
        .map((result) => result.reason)
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Exact action Runtime cleanup failed')
      }
    },
  }
}

function requirePid(child: SpawnedCodexChatRuntime['child']): number {
  const pid = child.pid
  if (!Number.isSafeInteger(pid) || (pid ?? 0) <= 1) {
    throw new Error('Exact action Runtime process ID is invalid')
  }
  return pid as number
}
