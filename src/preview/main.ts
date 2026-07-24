import { Component, createElement, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import * as ReactRuntime from 'react'
import * as JsxRuntime from 'react/jsx-runtime'
import * as JsxDevRuntime from 'react/jsx-dev-runtime'
import {
  isPreviewRenderMessage,
  type PreviewResponseMessage,
} from '../features/learning-workspace/previewProtocol'
import { evaluatePreviewModule } from './previewRuntime'
import './preview.css'

const previewRoot = document.getElementById('preview-root')
const previewStyle = document.createElement('style')
const allowedParentOrigins = new Set(
  (import.meta.env.VITE_ICU_APP_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean),
)

if (!previewRoot) {
  throw new Error('Preview root element를 찾지 못했습니다.')
}

document.head.append(previewStyle)
const root = createRoot(previewRoot)
root.render(
  createElement(
    'div',
    { className: 'preview-waiting' },
    createElement('strong', null, '실행 대기 중'),
    createElement('p', null, 'Workspace에서 실행하면 결과 화면이 여기에 표시됩니다.'),
  ),
)
let activeRequestId: string | null = null
let activeParentOrigin: string | null = null

const runtimeModules = {
  react: ReactRuntime,
  'react/jsx-runtime': JsxRuntime,
  'react/jsx-dev-runtime': JsxDevRuntime,
}

type ErrorBoundaryProps = {
  children?: ReactNode
  onError: (error: Error) => void
}

type ErrorBoundaryState = {
  error: Error | null
}

class PreviewErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.error) {
      return createElement(
        'div',
        { className: 'preview-error', role: 'alert' },
        createElement('strong', null, '화면을 렌더링하지 못했습니다.'),
        createElement('pre', null, this.state.error.message),
      )
    }

    return this.props.children
  }
}

window.addEventListener('message', (event) => {
  if (
    event.source !== window.parent ||
    !allowedParentOrigins.has(event.origin) ||
    !isPreviewRenderMessage(event.data)
  ) {
    return
  }

  const { bundle, requestId } = event.data
  activeRequestId = requestId
  activeParentOrigin = event.origin
  previewStyle.textContent = bundle.css
  let renderError: Error | null = null

  try {
    const PreviewComponent = evaluatePreviewModule(bundle.code, runtimeModules)
    flushSync(() => {
      root.render(
        createElement(
          PreviewErrorBoundary,
          {
            key: requestId,
            onError: (error: Error) => {
              renderError = error
              postPreviewMessage({
                type: 'icu:preview-error',
                requestId,
                error: error.message,
              })
            },
          },
          createElement(PreviewComponent),
        ),
      )
    })

    if (!renderError) {
      window.requestAnimationFrame(() => {
        if (activeRequestId === requestId) {
          postPreviewMessage({ type: 'icu:preview-rendered', requestId })
        }
      })
    }
  } catch (error) {
    postPreviewMessage({
      type: 'icu:preview-error',
      requestId,
      error: getErrorMessage(error),
    })
  }
})

window.addEventListener('error', (event) => {
  if (!activeRequestId) return
  postPreviewMessage({
    type: 'icu:preview-error',
    requestId: activeRequestId,
    error: event.error instanceof Error ? event.error.message : event.message,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  if (!activeRequestId) return
  postPreviewMessage({
    type: 'icu:preview-error',
    requestId: activeRequestId,
    error: getErrorMessage(event.reason),
  })
})

function notifyParentReady() {
  window.parent.postMessage({ type: 'icu:preview-ready' } satisfies PreviewResponseMessage, '*')
}

if (document.readyState === 'complete') {
  notifyParentReady()
} else {
  window.addEventListener('load', notifyParentReady, { once: true })
}

function postPreviewMessage(message: PreviewResponseMessage) {
  if (!activeParentOrigin) return
  window.parent.postMessage(message, activeParentOrigin)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
