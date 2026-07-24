import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactPreviewBundle } from './api/codeRunnerClient'
import { isTrustedPreviewEvent } from './previewProtocol'
import {
  createPreviewRequestCoordinator,
  type PreviewRequestCoordinator,
} from './previewRequestCoordinator'

const configuredPreviewUrl =
  import.meta.env.VITE_ICU_PREVIEW_URL ?? 'http://127.0.0.1:5174/preview.html'

export const reactPreviewUrl = new URL(configuredPreviewUrl).toString()
export const reactPreviewOrigin = new URL(configuredPreviewUrl).origin

export function useReactPreviewBridge() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const coordinatorRef = useRef<PreviewRequestCoordinator | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const coordinator = createPreviewRequestCoordinator({
      post(message) {
        const previewWindow = iframeRef.current?.contentWindow
        if (!previewWindow) {
          throw new Error('Preview 실행 화면에 연결하지 못했습니다.')
        }
        previewWindow.postMessage(message, reactPreviewOrigin)
      },
    })
    coordinatorRef.current = coordinator

    function handleMessage(event: MessageEvent) {
      const previewWindow = iframeRef.current?.contentWindow ?? null
      if (!isTrustedPreviewEvent(event, previewWindow, reactPreviewOrigin)) return

      if (event.data.type === 'icu:preview-ready') {
        setReady(true)
        coordinator?.markReady()
        return
      }

      coordinator?.handle(event.data)
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      coordinator.dispose()
      coordinatorRef.current = null
    }
  }, [setReady])

  const setIframeRef = useCallback(
    (node: HTMLIFrameElement | null) => {
      iframeRef.current = node
      if (!node) {
        setReady(false)
        coordinatorRef.current?.markUnavailable()
      }
    },
    [setReady],
  )

  const handleIframeLoad = useCallback(() => {
    setReady(false)
    coordinatorRef.current?.markUnavailable()
  }, [setReady])

  const renderPreview = useCallback((requestId: string, bundle: ReactPreviewBundle) => {
    return (
      coordinatorRef.current?.start(requestId, bundle) ??
      Promise.reject(new Error('Preview 요청 관리자를 초기화하지 못했습니다.'))
    )
  }, [])

  const cancelPreview = useCallback(() => {
    coordinatorRef.current?.cancel()
  }, [])

  return {
    iframeRef: setIframeRef,
    previewUrl: reactPreviewUrl,
    ready,
    handleIframeLoad,
    renderPreview,
    cancelPreview,
  }
}
