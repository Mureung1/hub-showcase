import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

const LazyCatCanvas = lazy(() => import('./CatCanvas'))
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

type CatStageState = 'idle' | 'selected' | 'generating' | 'result'

type CatStageProps = {
  assetSrc: string
  generatingAssetSrc?: string
  state: CatStageState
}

type CanvasErrorBoundaryProps = {
  children: ReactNode
  onError: () => void
}

type CanvasErrorBoundaryState = {
  failed: boolean
}

class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  state: CanvasErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

const getReducedMotionPreference = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(reducedMotionQuery).matches

const supportsWebGL = () =>
  typeof window !== 'undefined' && typeof window.WebGLRenderingContext !== 'undefined'

const isLowPowerDevice = () =>
  typeof navigator !== 'undefined' &&
  navigator.hardwareConcurrency > 0 &&
  navigator.hardwareConcurrency <= 2

function CatStage({ assetSrc, generatingAssetSrc, state }: CatStageProps) {
  const activeAssetSrc = state === 'generating' && generatingAssetSrc ? generatingAssetSrc : assetSrc
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getReducedMotionPreference)
  const [canvasReadyAsset, setCanvasReadyAsset] = useState<string | null>(null)
  const [canvasFailedAsset, setCanvasFailedAsset] = useState<string | null>(null)
  const [assetFailedSrc, setAssetFailedSrc] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const markCanvasFailed = () => {
    setCanvasReadyAsset(null)
    setCanvasFailedAsset(activeAssetSrc)
  }

  const canvasReady = canvasReadyAsset === activeAssetSrc
  const canvasFailed = canvasFailedAsset === activeAssetSrc
  const assetFailed = assetFailedSrc === activeAssetSrc
  const shouldRenderCanvas =
    supportsWebGL() && !isLowPowerDevice() && !prefersReducedMotion && !canvasFailed && !assetFailed

  // webglcontextlost는 버블링하지 않아 캡처 단계로 감지한다.
  // Canvas 내부(R3F 트리)의 리스너는 Suspense 재조정 과정에서 해제될 수 있어 스테이지 래퍼에 건다.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      setCanvasReadyAsset(null)
      setCanvasFailedAsset(activeAssetSrc)
    }

    stage.addEventListener('webglcontextlost', handleContextLost, true)
    return () => stage.removeEventListener('webglcontextlost', handleContextLost, true)
  }, [activeAssetSrc])

  // WebGLRenderer 생성 실패는 R3F 내부에서 커밋 이후 마이크로태스크로 재던져 동기 렌더 오류를
  // 잡는 ErrorBoundary를 우회하고 unhandledrejection으로만 드러난다. window 전역에서 함께 감시해
  // 같은 폴백 경로로 보낸다.
  useEffect(() => {
    if (!shouldRenderCanvas) return

    const isWebGLFailure = (message: unknown) =>
      typeof message === 'string' && message.includes('WebGL')

    const handleWindowError = (event: ErrorEvent) => {
      if (isWebGLFailure(event.message) || isWebGLFailure(event.error?.message)) {
        setCanvasReadyAsset(null)
        setCanvasFailedAsset(activeAssetSrc)
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      if (isWebGLFailure(reason?.message) || isWebGLFailure(reason)) {
        setCanvasReadyAsset(null)
        setCanvasFailedAsset(activeAssetSrc)
      }
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [activeAssetSrc, shouldRenderCanvas])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(reducedMotionQuery)
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const showsStaticFallback = !assetFailed && (!shouldRenderCanvas || !canvasReady)
  const renderer = assetFailed
    ? 'badge'
    : canvasFailed
      ? 'fallback'
      : shouldRenderCanvas
        ? canvasReady
          ? 'webgl'
          : 'loading'
        : 'static'

  return (
    <div aria-hidden="true" className="cat-stage" data-renderer={renderer} data-state={state} ref={stageRef}>
      <img
        alt=""
        className="cat-stage-fallback"
        data-visible={showsStaticFallback}
        draggable="false"
        onError={() => setAssetFailedSrc(activeAssetSrc)}
        src={activeAssetSrc}
      />
      {assetFailed && <span className="cat-stage-badge">냥</span>}
      {shouldRenderCanvas && (
        <CanvasErrorBoundary key={activeAssetSrc} onError={markCanvasFailed}>
          <Suspense fallback={null}>
            <LazyCatCanvas
              assetSrc={activeAssetSrc}
              onReady={() => setCanvasReadyAsset(activeAssetSrc)}
              state={state}
            />
          </Suspense>
        </CanvasErrorBoundary>
      )}
    </div>
  )
}

export { CatStage, type CatStageState }
