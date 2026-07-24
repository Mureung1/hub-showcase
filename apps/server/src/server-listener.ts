import {
  createServer,
  type RequestListener,
  type Server,
} from 'node:http'
import type { AddressInfo } from 'node:net'

import {
  claimServerApplicationListenerLifecycle,
  type ServerApplication,
} from './server-application.js'
import {
  requireServerStartupCleanup,
  type ServerStartupCleanup,
  type ServerStartupCleanupInput,
  type ServerStartupCleanupResult,
} from './server-startup-cleanup.js'

export type ServerListenOptions = {
  readonly host?: string
  readonly port: number
}

export type StartedServerListener = {
  readonly application: ServerApplication
  readonly port: number
}

export type BindServerApplicationListenerOptions =
  ServerListenOptions & {
    readonly requestHandler: RequestListener
  }

export type AttachedServerApplicationListener =
  StartedServerListener & {
    close(
      input: ServerStartupCleanupInput,
    ): Promise<ServerStartupCleanupResult>
  }

export type BoundServerApplicationListener = {
  readonly port: number
  attach(
    application: ServerApplication,
  ): AttachedServerApplicationListener
  close(
    input: ServerStartupCleanupInput,
  ): Promise<ServerStartupCleanupResult>
}

export async function bindServerApplicationListener(
  options: BindServerApplicationListenerOptions,
): Promise<BoundServerApplicationListener> {
  const listener = createServer(options.requestHandler)
  const closeUnattached: ServerStartupCleanup = () =>
    closeUnattachedListener(listener)
  try {
    await listen(listener, options.port, options.host)
    const address = listener.address()
    if (!address || typeof address === 'string') {
      throw new Error('Expected the Server application to bind a TCP port')
    }
    return createBoundServerApplicationListener(
      listener,
      (address as AddressInfo).port,
      closeUnattached,
    )
  } catch (error) {
    await requireServerStartupCleanup(closeUnattached)
    throw error
  }
}

export async function listenToServerApplication(
  application: ServerApplication,
  options: ServerListenOptions,
): Promise<StartedServerListener> {
  const listener = createServer(application.app)
  const startupCleanup = claimServerApplicationListenerLifecycle(
    application,
    (closeApplication, input) =>
      closeListeningServerApplication(
        listener,
        closeApplication,
        input,
      ),
  )
  try {
    await listen(listener, options.port, options.host)
    const address = listener.address()
    if (!address || typeof address === 'string') {
      throw new Error('Expected the Server application to bind a TCP port')
    }
    return {
      application,
      port: (address as AddressInfo).port,
    }
  } catch (error) {
    await requireServerStartupCleanup(startupCleanup)
    throw error
  }
}

function createBoundServerApplicationListener(
  listener: Server,
  port: number,
  closeUnattached: ServerStartupCleanup,
): BoundServerApplicationListener {
  let closing = false
  let applicationCleanup: ServerStartupCleanup | undefined
  let unattachedCleanupPromise:
    | Promise<ServerStartupCleanupResult>
    | undefined

  const close = (
    input: ServerStartupCleanupInput,
  ): Promise<ServerStartupCleanupResult> => {
    if (applicationCleanup) return applicationCleanup(input)
    closing = true
    if (unattachedCleanupPromise) return unattachedCleanupPromise
    const attempt = closeUnattached(input)
    unattachedCleanupPromise = attempt
    void attempt.then(
      (result) => {
        if (
          result.status === 'ambiguous' &&
          unattachedCleanupPromise === attempt
        ) {
          unattachedCleanupPromise = undefined
        }
      },
      () => {
        if (unattachedCleanupPromise === attempt) {
          unattachedCleanupPromise = undefined
        }
      },
    )
    return attempt
  }

  return Object.freeze({
    port,
    attach(
      application: ServerApplication,
    ): AttachedServerApplicationListener {
      if (closing) {
        throw new Error('The pre-bound Server listener is closing')
      }
      if (applicationCleanup) {
        throw new Error(
          'The pre-bound Server listener already attached an application',
        )
      }
      const cleanup = claimServerApplicationListenerLifecycle(
        application,
        (closeApplication, input) =>
          closeListeningServerApplication(
            listener,
            closeApplication,
            input,
          ),
      )
      applicationCleanup = cleanup
      return Object.freeze({
        application,
        port,
        close: cleanup,
      })
    },
    close,
  })
}

function listen(
  listener: Server,
  port: number,
  host: string | undefined,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      removeListeners()
      reject(error)
    }
    const onClose = () => {
      removeListeners()
      reject(new Error('Server application listener closed before binding'))
    }
    const removeListeners = () => {
      listener.off('error', onError)
      listener.off('close', onClose)
    }
    listener.once('error', onError)
    listener.once('close', onClose)
    listener.listen(port, host, () => {
      removeListeners()
      resolve()
    })
  })
}

async function closeUnattachedListener(
  listener: Server,
): Promise<ServerStartupCleanupResult> {
  try {
    const closing = closeListener(listener)
    listener.closeAllConnections()
    await closing
    return { status: 'closed', processTreeGone: true }
  } catch {
    return { status: 'ambiguous', processTreeGone: false }
  }
}

async function closeListeningServerApplication(
  listener: Server,
  closeApplication: (
    input: ServerStartupCleanupInput,
  ) => Promise<void>,
  input: ServerStartupCleanupInput,
): Promise<void> {
  const listenerClosed = closeListener(listener)
  const applicationClosed = closeApplication(input).finally(() => {
    listener.closeAllConnections()
  })
  const [applicationResult, listenerResult] = await Promise.allSettled([
    applicationClosed,
    listenerClosed,
  ])
  if (applicationResult.status === 'rejected') throw applicationResult.reason
  if (listenerResult.status === 'rejected') throw listenerResult.reason
}

function closeListener(listener: Server): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    listener.close((error) => {
      if (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_SERVER_NOT_RUNNING') {
          resolve()
          return
        }
        reject(error)
        return
      }
      resolve()
    })
  })
}
