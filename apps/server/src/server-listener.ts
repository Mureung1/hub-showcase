import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { ServerApplication } from './server-application.js'

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
  try {
    await listen(listener, options.port, options.host)
    const address = listener.address()
    if (!address || typeof address === 'string') {
      throw new Error('Expected the Server application to bind a TCP port')
    }
    return {
      application: bindListenerLifecycle(application, listener),
      port: (address as AddressInfo).port,
    }
  } catch (error) {
    listener.closeAllConnections()
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
    listener.once('error', reject)
    listener.listen(port, host, () => {
      listener.off('error', reject)
      resolve()
    })
  })
}

function bindListenerLifecycle(
  application: ServerApplication,
  listener: Server,
): ServerApplication {
  let closePromise: Promise<void> | undefined
  return {
    app: application.app,
    semesterWorkspace: application.semesterWorkspace,
    close() {
      closePromise ??= closeListeningServerApplication(listener, application)
      return closePromise
    },
  }
}

async function closeListeningServerApplication(
  listener: Server,
  application: ServerApplication,
): Promise<void> {
  const applicationClosed = application.close().finally(() => {
    listener.closeAllConnections()
  })
  const listenerClosed = new Promise<void>((resolve, reject) => {
    listener.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
  const [applicationResult, listenerResult] = await Promise.allSettled([
    applicationClosed,
    listenerClosed,
  ])
  if (applicationResult.status === 'rejected') throw applicationResult.reason
  if (listenerResult.status === 'rejected') throw listenerResult.reason
}
