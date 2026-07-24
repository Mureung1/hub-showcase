import type { ReactPreviewBundle } from './api/codeRunnerClient'
import {
  createPreviewRenderMessage,
  type PreviewRenderMessage,
  type PreviewResponseMessage,
} from './previewProtocol'

export class PreviewTimeoutError extends Error {
  constructor() {
    super('실행 화면 응답 시간이 초과되었습니다.')
    this.name = 'PreviewTimeoutError'
  }
}

export class PreviewRenderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PreviewRenderError'
  }
}

export class PreviewCancelledError extends Error {
  constructor() {
    super('새 실행 요청으로 이전 Preview 요청을 취소했습니다.')
    this.name = 'PreviewCancelledError'
  }
}

type PreviewRequestCoordinatorOptions = {
  post: (message: PreviewRenderMessage) => void
  timeoutMs?: number
}

type PendingRequest = {
  requestId: string
  message: PreviewRenderMessage
  resolve: () => void
  reject: (error: Error) => void
  timer?: ReturnType<typeof setTimeout>
  sent: boolean
}

export function createPreviewRequestCoordinator({
  post,
  timeoutMs = 5000,
}: PreviewRequestCoordinatorOptions) {
  let ready = false
  let pending: PendingRequest | null = null

  function clearPendingTimer() {
    if (pending?.timer) clearTimeout(pending.timer)
  }

  function settlePending(callback: (request: PendingRequest) => void) {
    if (!pending) return
    const request = pending
    clearPendingTimer()
    pending = null
    callback(request)
  }

  function sendPending() {
    if (!ready || !pending || pending.sent) return

    try {
      post(pending.message)
      pending.sent = true
      pending.timer = setTimeout(() => {
        settlePending((request) => request.reject(new PreviewTimeoutError()))
      }, timeoutMs)
    } catch (error) {
      settlePending((request) => {
        request.reject(error instanceof Error ? error : new Error(String(error)))
      })
    }
  }

  return {
    start(requestId: string, bundle: ReactPreviewBundle) {
      settlePending((request) => request.reject(new PreviewCancelledError()))

      const result = new Promise<void>((resolve, reject) => {
        pending = {
          requestId,
          message: createPreviewRenderMessage(requestId, bundle),
          resolve,
          reject,
          sent: false,
        }
      })

      sendPending()
      return result
    },
    markReady() {
      ready = true
      sendPending()
    },
    markUnavailable() {
      ready = false
    },
    handle(message: PreviewResponseMessage) {
      if (!pending || !('requestId' in message) || message.requestId !== pending.requestId) return

      if (message.type === 'icu:preview-rendered') {
        settlePending((request) => request.resolve())
      } else if (message.type === 'icu:preview-error') {
        settlePending((request) => request.reject(new PreviewRenderError(message.error)))
      }
    },
    cancel() {
      settlePending((request) => request.reject(new PreviewCancelledError()))
    },
    dispose() {
      ready = false
      settlePending((request) => request.reject(new PreviewCancelledError()))
    },
  }
}

export type PreviewRequestCoordinator = ReturnType<typeof createPreviewRequestCoordinator>
