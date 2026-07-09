import type {
  AgentRuntimeAdapter,
  RuntimeAdapterEvent,
  RuntimeAdapterRunInput,
} from '@ay-ple/runtime-core'

export type FakeRuntimeAdapterOptions = {
  delayMs?: number
}

export class FakeRuntimeAdapter implements AgentRuntimeAdapter {
  readonly name = 'fake'
  readonly label = 'Fake Runtime'
  readonly description = 'Deterministic local adapter for Runtime Inspector development'

  private readonly delayMs: number
  private pendingFailureRuns = 0

  constructor(options: FakeRuntimeAdapterOptions = {}) {
    this.delayMs = options.delayMs ?? 120
  }

  failNextRun(): void {
    this.pendingFailureRuns += 1
  }

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    if (this.consumePendingFailureRun()) {
      throw new Error('Fake runtime deterministic failure requested')
    }

    const chunks = [
      `Fake runtime received: "${input.prompt}".\n`,
      'This deterministic response proves the inspector can observe a run end to end.',
    ]

    for (const chunk of chunks) {
      await delay(this.delayMs, input.signal)

      if (input.signal.aborted) {
        return
      }

      yield {
        type: 'output_delta',
        delta: chunk,
      }
    }

    yield { type: 'completed' }
  }

  private consumePendingFailureRun(): boolean {
    if (this.pendingFailureRuns < 1) {
      return false
    }

    this.pendingFailureRuns -= 1

    return true
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    const abort = () => {
      clearTimeout(timeout)
      resolve()
    }

    signal.addEventListener('abort', abort, { once: true })
  })
}
