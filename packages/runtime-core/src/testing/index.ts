import {
  AgentRuntimeKernel,
  type AgentRuntimeKernelOptions,
  type RuntimeRunLog,
  type RuntimeRunLogPersistence,
  type RuntimeRunLogPersistenceSaveResult,
} from '../index.js'

export class InMemoryRuntimeRunLogPersistence
  implements RuntimeRunLogPersistence
{
  private readonly logs = new Map<string, RuntimeRunLog>()

  constructor(initialLogs: RuntimeRunLog[] = []) {
    for (const log of initialLogs) {
      this.logs.set(log.runId, cloneRuntimeRunLog(log))
    }
  }

  async load(): Promise<RuntimeRunLog[]> {
    return [...this.logs.values()].map(cloneRuntimeRunLog)
  }

  async save(
    log: RuntimeRunLog,
  ): Promise<RuntimeRunLogPersistenceSaveResult> {
    this.logs.set(log.runId, cloneRuntimeRunLog(log))

    return { removedRunIds: [] }
  }

  async remove(runId: string): Promise<void> {
    this.logs.delete(runId)
  }
}

export async function createInMemoryRuntimeKernel(
  options: Omit<AgentRuntimeKernelOptions, 'persistence'>,
): Promise<AgentRuntimeKernel> {
  return AgentRuntimeKernel.create({
    ...options,
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })
}

export async function waitForRuntimeCondition<T>(
  read: () => T | Promise<T>,
  predicate: (value: T) => boolean,
  options: {
    timeoutMs?: number
    failureMessage?: string
  } = {},
): Promise<T> {
  const deadline = Date.now() + (options.timeoutMs ?? 1000)

  while (Date.now() < deadline) {
    const value = await read()

    if (predicate(value)) {
      return value
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }

  throw new Error(
    options.failureMessage ?? 'expected runtime condition was not observed',
  )
}

function cloneRuntimeRunLog(log: RuntimeRunLog): RuntimeRunLog {
  return structuredClone(log)
}
