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

  constructor(options: FakeRuntimeAdapterOptions = {}) {
    this.delayMs = options.delayMs ?? 120
  }

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    const chunks = [
      `Fake runtime received: "${input.prompt}".\n`,
      'This deterministic response proves the inspector can observe a run end to end.',
    ]

    for (const chunk of chunks) {
      await delay(this.delayMs)
      yield {
        type: 'output_delta',
        delta: chunk,
      }
    }

    yield { type: 'completed' }
  }
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
