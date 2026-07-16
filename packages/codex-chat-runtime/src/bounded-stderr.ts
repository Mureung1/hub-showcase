export interface BoundedStderrCaptureOptions {
  readonly maxFrames: number
  readonly maxBytes: number
}

export interface BoundedStderrSnapshot {
  readonly bytes: number
  readonly frames: number
  readonly text: string
  readonly truncated: boolean
}

export class BoundedStderrCapture {
  private readonly chunks: Buffer[] = []
  private readonly maxFrames: number
  private readonly maxBytes: number
  private retainedBytes = 0
  private truncated = false

  constructor(options: BoundedStderrCaptureOptions) {
    this.maxFrames = options.maxFrames
    this.maxBytes = options.maxBytes
  }

  append(chunk: Buffer): void {
    if (chunk.byteLength === 0) return
    let retained = Buffer.from(chunk)
    if (retained.byteLength > this.maxBytes) {
      retained = retained.subarray(retained.byteLength - this.maxBytes)
      retained = Buffer.from(retained)
      this.truncated = true
    }
    this.chunks.push(retained)
    this.retainedBytes += retained.byteLength
    while (
      this.chunks.length > this.maxFrames ||
      this.retainedBytes > this.maxBytes
    ) {
      const removed = this.chunks.shift()
      if (!removed) break
      this.retainedBytes -= removed.byteLength
      this.truncated = true
    }
  }

  snapshot(): BoundedStderrSnapshot {
    return {
      bytes: this.retainedBytes,
      frames: this.chunks.length,
      text: Buffer.concat(this.chunks, this.retainedBytes).toString('utf8'),
      truncated: this.truncated,
    }
  }
}
