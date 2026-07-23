import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import {
  claimServerApplicationListenerLifecycle,
  type ServerApplication,
} from './server-application.js'

export type ServerListenOptions = {
  readonly host?: string
  readonly port: number
}

export type StartedServerListener = {
  readonly application: ServerApplication
  readonly port: number
}

export async function listenToServerApplication(
  application: ServerApplication,
  options: ServerListenOptions,
): Promise<StartedServerListener> {
  const listener = createServer(application.app)
  claimServerApplicationListenerLifecycle(
    application,
    (closeApplication) =>
      closeListeningServerApplication(listener, closeApplication),
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
    await application.close().catch(() => undefined)
    throw error
  }
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

async function closeListeningServerApplication(
  listener: Server,
  closeApplication: () => Promise<void>,
): Promise<void> {
  const listenerClosed = closeListener(listener)
  const applicationClosed = closeApplication().finally(() => {
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
