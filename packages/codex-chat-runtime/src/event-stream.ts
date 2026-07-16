import type { CodexChatEvent } from './contract.js'

type WaitingConsumer = {
  resolve(result: IteratorResult<CodexChatEvent>): void
}

export class CodexChatEventStream implements AsyncIterable<CodexChatEvent> {
  private readonly queued: CodexChatEvent[] = []
  private readonly waiting: WaitingConsumer[] = []
  private iteratorCreated = false
  private finished = false
  private consumerEnded = false

  push(event: CodexChatEvent): void {
    if (this.finished || this.consumerEnded) return
    const waiter = this.waiting.shift()
    if (waiter) {
      waiter.resolve({ done: false, value: event })
      return
    }
    this.queued.push(event)
  }

  finish(): void {
    if (this.finished) return
    this.finished = true
    for (const waiter of this.waiting.splice(0)) {
      waiter.resolve({ done: true, value: undefined })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<CodexChatEvent> {
    if (this.iteratorCreated) {
      throw new TypeError('A Codex turn event stream has one consumer')
    }
    this.iteratorCreated = true
    return {
      next: () => this.next(),
      return: async () => {
        this.consumerEnded = true
        this.queued.length = 0
        for (const waiter of this.waiting.splice(0)) {
          waiter.resolve({ done: true, value: undefined })
        }
        return { done: true, value: undefined }
      },
    }
  }

  private async next(): Promise<IteratorResult<CodexChatEvent>> {
    const event = this.queued.shift()
    if (event) return { done: false, value: event }
    if (this.finished || this.consumerEnded) {
      return { done: true, value: undefined }
    }
    return new Promise((resolve) => {
      this.waiting.push({ resolve })
    })
  }
}
