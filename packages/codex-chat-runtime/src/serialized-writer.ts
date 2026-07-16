import type { Writable } from 'node:stream'

import type { AggregateOperationQueueBudget } from './event-stream.js'

export interface SerializedBridgeWriterOptions {
  readonly maxFrames: number
  readonly maxBytes: number
  readonly aggregate: AggregateOperationQueueBudget
  readonly onOverflow: () => void
}

interface PendingWrite {
  readonly bytes: Buffer
  readonly onDispatch?: () => void
  readonly reject: (error: unknown) => void
  readonly resolve: () => void
  settled: boolean
}

export class SerializedBridgeWriter {
  private readonly stream: Writable
  private readonly options: SerializedBridgeWriterOptions
  private readonly queued: PendingWrite[] = []
  private inFlight: PendingWrite | undefined
  private retainedFrames = 0
  private retainedBytes = 0
  private cancelled: unknown

  constructor(stream: Writable, options: SerializedBridgeWriterOptions) {
    this.stream = stream
    this.options = options
  }

  write(bytes: Buffer, onDispatch?: () => void): Promise<void> {
    if (this.cancelled) return Promise.reject(this.cancelled)
    const retained = Buffer.from(bytes)
    if (
      this.retainedFrames + 1 > this.options.maxFrames ||
      this.retainedBytes + retained.byteLength > this.options.maxBytes ||
      !this.options.aggregate.reserve(1, retained.byteLength)
    ) {
      this.options.onOverflow()
      return Promise.reject(new Error('Bridge writer buffer limit exceeded'))
    }
    this.retainedFrames += 1
    this.retainedBytes += retained.byteLength
    const operation = new Promise<void>((resolve, reject) => {
      this.queued.push({
        bytes: retained,
        onDispatch,
        reject,
        resolve,
        settled: false,
      })
    })
    void operation.catch(() => undefined)
    this.pump()
    return operation
  }

  cancel(error: unknown): void {
    if (this.cancelled) return
    this.cancelled = error
    if (this.inFlight && !this.inFlight.settled) {
      this.inFlight.settled = true
      this.inFlight.reject(error)
    }
    for (const entry of this.queued.splice(0)) {
      this.release(entry)
      if (!entry.settled) {
        entry.settled = true
        entry.reject(error)
      }
    }
  }

  private pump(): void {
    if (this.inFlight || this.cancelled) return
    const entry = this.queued.shift()
    if (!entry) return
    this.inFlight = entry
    if (this.stream.destroyed || this.stream.writableEnded) {
      this.finish(entry, new Error('Bridge stdin is closed'))
      return
    }
    try {
      entry.onDispatch?.()
      this.stream.write(entry.bytes, (error) => this.finish(entry, error))
    } catch (error) {
      this.finish(entry, error)
    }
  }

  private finish(entry: PendingWrite, error?: unknown): void {
    if (this.inFlight !== entry) return
    this.inFlight = undefined
    this.release(entry)
    if (!entry.settled) {
      entry.settled = true
      if (error) entry.reject(error)
      else entry.resolve()
    }
    if (error) this.cancel(error)
    else this.pump()
  }

  private release(entry: PendingWrite): void {
    this.retainedFrames -= 1
    this.retainedBytes -= entry.bytes.byteLength
    this.options.aggregate.release(1, entry.bytes.byteLength)
  }
}
