export type LiveSignal = 'SIGINT' | 'SIGTERM'

export type LiveSignalSource = {
  on(signal: LiveSignal, listener: () => void): unknown
  off(signal: LiveSignal, listener: () => void): unknown
}

export class LiveSignalInterruptedError extends Error {
  constructor(readonly signal: LiveSignal) {
    super(signal)
    this.name = 'LiveSignalInterruptedError'
  }
}

export async function runWithLiveSignalAbort<T>(
  run: (signal: AbortSignal, abort: () => void) => Promise<T>,
  signalSource: LiveSignalSource = process,
): Promise<T> {
  const abortController = new AbortController()
  let interruptedBy: LiveSignal | undefined

  const interrupt = (signal: LiveSignal) => {
    if (interruptedBy) return
    interruptedBy = signal
    abortController.abort()
  }
  const onSigint = () => interrupt('SIGINT')
  const onSigterm = () => interrupt('SIGTERM')

  signalSource.on('SIGINT', onSigint)
  signalSource.on('SIGTERM', onSigterm)
  try {
    try {
      const result = await run(
        abortController.signal,
        () => abortController.abort(),
      )
      if (interruptedBy) throw new LiveSignalInterruptedError(interruptedBy)
      return result
    } catch (error) {
      if (interruptedBy && !(error instanceof AggregateError)) {
        throw new LiveSignalInterruptedError(interruptedBy)
      }
      throw error
    }
  } finally {
    signalSource.off('SIGINT', onSigint)
    signalSource.off('SIGTERM', onSigterm)
  }
}
