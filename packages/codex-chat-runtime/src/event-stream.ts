import type { CodexChatEvent } from './contract.js'

type WaitingConsumer<Event> = {
  resolve(result: IteratorResult<Event>): void
}

type QueuedEvent<Event> = {
  readonly event: Event
  readonly byteLength: number
}

export interface CodexChatEventStreamOptions {
  readonly maxFrames: number
  readonly maxBytes: number
  readonly aggregate: AggregateOperationQueueBudget
  readonly onOverflow: () => void
}

export class AggregateOperationQueueBudget {
  private frames = 0
  private bytes = 0

  constructor(
    private readonly maxFrames: number,
    private readonly maxBytes: number,
  ) {}

  reserve(frames: number, bytes: number): boolean {
    if (
      this.frames + frames > this.maxFrames ||
      this.bytes + bytes > this.maxBytes
    ) {
      return false
    }
    this.frames += frames
    this.bytes += bytes
    return true
  }

  release(frames: number, bytes: number): void {
    this.frames -= frames
    this.bytes -= bytes
    if (this.frames < 0 || this.bytes < 0) {
      throw new Error('Operation queue accounting underflow')
    }
  }

  snapshot(): { readonly frames: number; readonly bytes: number } {
    return { frames: this.frames, bytes: this.bytes }
  }
}

export class CodexChatEventStream<Event = CodexChatEvent>
  implements AsyncIterable<Event>
{
  private readonly queued: QueuedEvent<Event>[] = []
  private readonly waiting: WaitingConsumer<Event>[] = []
  private readonly options: CodexChatEventStreamOptions
  private queuedBytes = 0
  private iteratorCreated = false
  private finished = false
  private consumerEnded = false

  constructor(options: CodexChatEventStreamOptions) {
    this.options = options
  }

  push(event: Event, byteLength: number): void {
    if (this.finished || this.consumerEnded) return
    const waiter = this.waiting.shift()
    if (waiter) {
      waiter.resolve({ done: false, value: event })
      return
    }
    if (
      this.queued.length + 1 > this.options.maxFrames ||
      this.queuedBytes + byteLength > this.options.maxBytes ||
      !this.options.aggregate.reserve(1, byteLength)
    ) {
      this.options.onOverflow()
      return
    }
    this.queued.push({ event, byteLength })
    this.queuedBytes += byteLength
  }

  fail(event: Event): void {
    if (this.consumerEnded) return
    this.clearQueued()
    this.finished = true
    const waiter = this.waiting.shift()
    if (waiter) waiter.resolve({ done: false, value: event })
    else this.queued.push({ event, byteLength: 0 })
    for (const remaining of this.waiting.splice(0)) {
      remaining.resolve({ done: true, value: undefined })
    }
  }

  finish(): void {
    if (this.finished) return
    this.finished = true
    for (const waiter of this.waiting.splice(0)) {
      waiter.resolve({ done: true, value: undefined })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<Event> {
    if (this.iteratorCreated) {
      throw new TypeError('A Codex turn event stream has one consumer')
    }
    this.iteratorCreated = true
    return {
      next: () => this.next(),
      return: async () => {
        this.consumerEnded = true
        this.clearQueued()
        for (const waiter of this.waiting.splice(0)) {
          waiter.resolve({ done: true, value: undefined })
        }
        return { done: true, value: undefined }
      },
    }
  }

  private async next(): Promise<IteratorResult<Event>> {
    const queued = this.queued.shift()
    if (queued) {
      if (queued.byteLength > 0) {
        this.queuedBytes -= queued.byteLength
        this.options.aggregate.release(1, queued.byteLength)
      }
      return { done: false, value: queued.event }
    }
    if (this.finished || this.consumerEnded) {
      return { done: true, value: undefined }
    }
    return new Promise((resolve) => {
      this.waiting.push({ resolve })
    })
  }

  private clearQueued(): void {
    if (this.queued.length > 0 && this.queuedBytes > 0) {
      const measuredFrames = this.queued.filter(
        ({ byteLength }) => byteLength > 0,
      ).length
      this.options.aggregate.release(measuredFrames, this.queuedBytes)
    }
    this.queued.length = 0
    this.queuedBytes = 0
  }
}
