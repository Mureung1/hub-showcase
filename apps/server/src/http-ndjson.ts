const defaultHttpWriteDrainMs = 5_000

export interface NdjsonWritable {
  readonly destroyed: boolean
  readonly writableEnded: boolean
  write(chunk: string): boolean
  destroy(): void
  once(event: 'close' | 'drain', listener: () => void): unknown
  off(event: 'close' | 'drain', listener: () => void): unknown
}

export async function writeNdjsonLine<T extends object>(
  response: NdjsonWritable,
  frame: T,
  writeDrainMs = defaultHttpWriteDrainMs,
): Promise<boolean> {
  if (response.destroyed || response.writableEnded) return false
  try {
    if (response.write(`${JSON.stringify(frame)}\n`)) return true
  } catch {
    return false
  }
  if (response.destroyed || response.writableEnded) return false
  return new Promise((resolve) => {
    let settled = false
    let deadline: ReturnType<typeof setTimeout> | undefined
    const onDrain = () => finish('drained')
    const onClose = () => finish('closed')
    const finish = (outcome: 'drained' | 'closed' | 'timed-out') => {
      if (settled) return
      settled = true
      if (deadline) clearTimeout(deadline)
      response.off('drain', onDrain)
      response.off('close', onClose)
      if (outcome === 'timed-out') {
        try {
          response.destroy()
        } catch {
          // The stalled write is already classified as disconnected.
        }
      }
      resolve(outcome === 'drained')
    }
    response.once('drain', onDrain)
    response.once('close', onClose)
    deadline = setTimeout(() => finish('timed-out'), writeDrainMs)
  })
}
