export class NdjsonTrace {
  private readonly frames: Array<Record<string, unknown>> = []
  private buffer = ''

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
    private readonly endedMessage: (
      frames: readonly Record<string, unknown>[],
    ) => string = () => 'NDJSON stream ended before target frame',
  ) {}

  async until(
    predicate: (frame: Record<string, unknown>) => boolean,
  ): Promise<Record<string, unknown>> {
    for (;;) {
      const found = this.frames.find(predicate)
      if (found) return found
      const next = await this.reader.read()
      if (next.done) {
        throw new Error(this.endedMessage(this.frames))
      }
      this.buffer += new TextDecoder().decode(next.value, { stream: true })
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line) {
          this.frames.push(JSON.parse(line) as Record<string, unknown>)
        }
      }
    }
  }

  all(): readonly Record<string, unknown>[] {
    return structuredClone(this.frames)
  }

  cancel(): Promise<void> {
    return this.reader.cancel()
  }
}
