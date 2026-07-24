import type { ServerApplication } from './server-application.js'

export type ServerProcessSignal = 'SIGINT' | 'SIGTERM'

export type ServerProcessSignalSource = {
  readonly pid: number
  kill(pid: number, signal: ServerProcessSignal): unknown
  off(signal: ServerProcessSignal, listener: () => void): unknown
  once(signal: ServerProcessSignal, listener: () => void): unknown
}

export type InstallServerProcessSignalHandlersOptions = {
  readonly logError?: (message: string) => void
  readonly signalSource?: ServerProcessSignalSource
}

export function installServerProcessSignalHandlers(
  application: Pick<ServerApplication, 'close'>,
  options: InstallServerProcessSignalHandlersOptions = {},
): () => void {
  const signalSource = options.signalSource ?? process
  const logError = options.logError ?? console.error
  let shuttingDown = false

  const removeListeners = () => {
    signalSource.off('SIGINT', onSigint)
    signalSource.off('SIGTERM', onSigterm)
  }
  const shutdown = (signal: ServerProcessSignal) => {
    if (shuttingDown) return
    shuttingDown = true
    void application
      .close()
      .catch((error: unknown) => {
        logError(
          `Unable to close server: ${error instanceof Error ? error.message : String(error)}`,
        )
      })
      .finally(() => {
        removeListeners()
        signalSource.kill(signalSource.pid, signal)
      })
  }
  const onSigint = () => shutdown('SIGINT')
  const onSigterm = () => shutdown('SIGTERM')
  signalSource.once('SIGINT', onSigint)
  signalSource.once('SIGTERM', onSigterm)
  return removeListeners
}
