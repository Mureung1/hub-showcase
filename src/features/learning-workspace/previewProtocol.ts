import type { ReactPreviewBundle } from './api/codeRunnerClient'

export type PreviewRenderMessage = {
  type: 'icu:preview-render'
  requestId: string
  bundle: ReactPreviewBundle
}

export type PreviewResponseMessage =
  | { type: 'icu:preview-ready' }
  | { type: 'icu:preview-rendered'; requestId: string }
  | { type: 'icu:preview-error'; requestId: string; error: string }

export function createPreviewRenderMessage(
  requestId: string,
  bundle: ReactPreviewBundle,
): PreviewRenderMessage {
  return { type: 'icu:preview-render', requestId, bundle }
}

export function isPreviewRenderMessage(value: unknown): value is PreviewRenderMessage {
  if (
    !isRecord(value) ||
    value.type !== 'icu:preview-render' ||
    typeof value.requestId !== 'string'
  ) {
    return false
  }

  if (!isRecord(value.bundle)) return false

  return (
    value.bundle.kind === 'react' &&
    typeof value.bundle.code === 'string' &&
    typeof value.bundle.css === 'string' &&
    typeof value.bundle.componentName === 'string'
  )
}

export function isPreviewResponseMessage(value: unknown): value is PreviewResponseMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  if (value.type === 'icu:preview-ready') return true
  if (value.type === 'icu:preview-rendered') return typeof value.requestId === 'string'
  if (value.type === 'icu:preview-error') {
    return typeof value.requestId === 'string' && typeof value.error === 'string'
  }
  return false
}

export function isTrustedPreviewEvent(
  event: MessageEvent,
  expectedSource: Window | null,
  expectedOrigin: string,
) {
  return (
    event.source === expectedSource &&
    event.origin === expectedOrigin &&
    isPreviewResponseMessage(event.data)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
