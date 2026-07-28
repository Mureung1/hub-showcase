import express, { type Express } from 'express'

import type {
  ServerStartupCleanup,
  ServerStartupCleanupInput,
  ServerStartupCleanupResult,
} from './server-startup-cleanup.js'

export type CreateServerAppOptions = Record<string, never>

export interface ServerApplication {
  readonly app: Express
  close(): Promise<void>
}

type CloseServerApplication = (
  input: ServerStartupCleanupInput,
) => Promise<void>

type ServerApplicationListenerLifecycle = (
  closeApplication: CloseServerApplication,
  input: ServerStartupCleanupInput,
) => Promise<void>

type ServerApplicationCleanupAttemptResult =
  | Extract<ServerStartupCleanupResult, { status: 'closed' }>
  | (
      Extract<ServerStartupCleanupResult, { status: 'ambiguous' }> & {
        readonly cause: unknown
      }
    )

type ServerApplicationLifecycle = {
  closing: boolean
  listenerClaimed: boolean
  readonly closeApplication: CloseServerApplication
  closeWithListener?: ServerApplicationListenerLifecycle
  cleanupPromise?: Promise<ServerApplicationCleanupAttemptResult>
  closePromise?: Promise<void>
}

const serverApplicationLifecycles = new WeakMap<
  ServerApplication,
  ServerApplicationLifecycle
>()

export async function createServerApplication(
  _options: CreateServerAppOptions = {},
): Promise<ServerApplication> {
  const app = express()
  const closeApplication: CloseServerApplication = async () => undefined
  const lifecycle: ServerApplicationLifecycle = {
    closing: false,
    listenerClaimed: false,
    closeApplication,
  }
  const application: ServerApplication = {
    app,
    close() {
      if (lifecycle.closePromise) return lifecycle.closePromise
      const cleanup = cleanupServerApplication(lifecycle, {
        signal: new AbortController().signal,
      })
      const close = cleanup.then((result) => {
        if (
          result.status !== 'closed' ||
          !result.processTreeGone
        ) {
          throw result.cause
        }
      })
      lifecycle.closePromise = close
      void close.catch(() => {
        if (lifecycle.closePromise === close) {
          lifecycle.closePromise = undefined
        }
      })
      return close
    },
  }
  serverApplicationLifecycles.set(application, lifecycle)
  return application
}

export function claimServerApplicationListenerLifecycle(
  application: ServerApplication,
  closeWithListener: ServerApplicationListenerLifecycle,
): ServerStartupCleanup {
  const lifecycle = serverApplicationLifecycles.get(application)
  if (!lifecycle) {
    throw new TypeError(
      'The Server application was not created by createServerApplication',
    )
  }
  if (lifecycle.closing) {
    throw new Error('Server application is closing')
  }
  if (lifecycle.listenerClaimed) {
    throw new Error('Server application listener lifecycle is already claimed')
  }
  lifecycle.listenerClaimed = true
  lifecycle.closeWithListener = closeWithListener
  return async (input) => {
    const result = await cleanupServerApplication(lifecycle, input)
    return result.status === 'closed'
      ? result
      : { status: 'ambiguous', processTreeGone: false }
  }
}

function cleanupServerApplication(
  lifecycle: ServerApplicationLifecycle,
  input: ServerStartupCleanupInput,
): Promise<ServerApplicationCleanupAttemptResult> {
  if (lifecycle.cleanupPromise) return lifecycle.cleanupPromise
  lifecycle.closing = true
  const attempt = (async (): Promise<
    ServerApplicationCleanupAttemptResult
  > => {
    try {
      if (lifecycle.closeWithListener) {
        await lifecycle.closeWithListener(
          lifecycle.closeApplication,
          input,
        )
      } else {
        await lifecycle.closeApplication(input)
      }
      return { status: 'closed', processTreeGone: true }
    } catch (cause) {
      return {
        status: 'ambiguous',
        processTreeGone: false,
        cause,
      }
    }
  })()
  lifecycle.cleanupPromise = attempt
  void attempt.then(
    (result) => {
      if (
        result.status === 'ambiguous' &&
        lifecycle.cleanupPromise === attempt
      ) {
        lifecycle.cleanupPromise = undefined
      }
    },
    () => {
      if (lifecycle.cleanupPromise === attempt) {
        lifecycle.cleanupPromise = undefined
      }
    },
  )
  return attempt
}
